import { districtName, nearestDistrictKey, resolveDistrictKey, OTHER_DISTRICT_KEY } from "@/lib/districts";

const DEFAULT_API_URL = "https://api.ipgeolocation.io/ipgeo";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 5000;
const REQUEST_TIMEOUT_MS = 4000;

export interface ApproxLocationDto {
  lat: number;
  lng: number;
  city: string | null;
  /** Quận nội thành (key của HANOI_7_DISTRICTS) hoặc "khac" */
  districtKey: string;
  districtName: string;
  countryCode: string | null;
  source: "ip";
}

const cache = new Map<string, { value: ApproxLocationDto | null; expiresAt: number }>();

/** IP nội bộ (dev chạy localhost) không tra được; khi đó để API tự lấy IP công khai của máy chủ. */
function isPrivateIp(ip: string): boolean {
  return (
    ip === "::1" ||
    ip.startsWith("127.") ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ||
    ip.startsWith("fc") ||
    ip.startsWith("fd")
  );
}

type RawGeo = Record<string, unknown>;

/** Đọc cả định dạng v1 (trường phẳng) lẫn v2 (`location.*`) của ipgeolocation.io. */
export function parseGeoResponse(body: unknown): ApproxLocationDto | null {
  if (!body || typeof body !== "object") return null;
  const root = body as RawGeo;
  const geo = (typeof root.location === "object" && root.location ? root.location : root) as RawGeo;
  const lat = Number(geo.latitude);
  const lng = Number(geo.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return null;

  const district = typeof geo.district === "string" ? geo.district : "";
  const city = typeof geo.city === "string" && geo.city ? geo.city : null;
  // Ưu tiên tên quận API trả về; không có thì đoán theo tâm quận gần nhất
  const byName = resolveDistrictKey(`${district} ${city ?? ""}`);
  const districtKey = byName !== OTHER_DISTRICT_KEY ? byName : nearestDistrictKey({ lat, lng });

  return {
    lat,
    lng,
    city,
    districtKey,
    districtName: districtName(districtKey),
    countryCode: typeof geo.country_code2 === "string" ? geo.country_code2 : null,
    source: "ip",
  };
}

/**
 * Vị trí ước tính (mức thành phố/quận) từ IP qua IP_GEOLOCATION_API_KEY. Không lưu IP hay vị trí vào DB,
 * chỉ cache trong bộ nhớ vài giờ để không tốn quota. Lỗi/thiếu key thì trả null.
 */
export async function lookupIpLocation(ip: string, now: number = Date.now()): Promise<ApproxLocationDto | null> {
  const apiKey = process.env.IP_GEOLOCATION_API_KEY?.trim();
  if (!apiKey) return null;

  // Production mà không có IP thật (thiếu header proxy) thì không đoán, tránh gán vị trí máy chủ cho mọi người
  if (isPrivateIp(ip) && process.env.NODE_ENV === "production") return null;
  const cacheKey = isPrivateIp(ip) ? "self" : ip;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > now) return cached.value;

  const url = new URL(process.env.IP_GEOLOCATION_API_URL?.trim() || DEFAULT_API_URL);
  url.searchParams.set("apiKey", apiKey);
  if (cacheKey !== "self") url.searchParams.set("ip", ip);

  let value: ApproxLocationDto | null = null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS), cache: "no-store" });
    if (res.ok) value = parseGeoResponse(await res.json());
    else console.warn(`[IP Geolocation] API trả ${res.status}`);
  } catch (err) {
    console.warn("[IP Geolocation] Không gọi được API:", err instanceof Error ? err.message : err);
    return null; // lỗi mạng không cache để lần sau thử lại
  }

  if (cache.size >= MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value as string);
  cache.set(cacheKey, { value, expiresAt: now + CACHE_TTL_MS });
  return value;
}
