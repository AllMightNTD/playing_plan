import { GoogleGenAI } from "@google/genai";
import {
  buildGoogleMapsSearchUrl,
  cleanAddressText,
  MapLocationParams,
} from "./google-maps.builder";

export interface EnrichedMapData {
  address: string;
  googleMapsUrl: string;
  googlePlaceId?: string | null;
  source: "google_places" | "nominatim" | "gemini_ai" | "heuristic";
}

export interface PlaceInputForEnrichment {
  id: string;
  name: string;
  address?: string | null;
  area?: string | null;
  lat: number;
  lng: number;
  category?: string;
}

/**
 * Kiểm tra xem địa chỉ có phải dạng placeholder / generic không.
 */
export function isGenericAddress(address?: string | null): boolean {
  if (!address || typeof address !== "string") return true;
  const trimmed = address.trim();
  if (trimmed === "" || trimmed === "Hà Nội") return true;
  if (/^Hà Nội\s*\([^)]+\)$/i.test(trimmed)) return true;
  if (
    /^(Hoàn Kiếm|Ba Đình|Tây Hồ|Đống Đa|Cầu Giấy|Hai Bà Trưng|Thanh Xuân|Hà Đông|Nam Từ Liêm|Bắc Từ Liêm|Long Biên|Hoàng Mai|Gia Lâm|Sóc Sơn|Ba Vì),\s*Hà Nội$/i.test(
      trimmed
    )
  ) {
    return true;
  }
  return false;
}

/**
 * Tier 1: Gọi Google Places API Text Search hoặc Geocoding API (khi có GOOGLE_MAPS_API_KEY).
 */
async function tryGoogleMapsApi(
  place: PlaceInputForEnrichment,
  apiKey: string
): Promise<EnrichedMapData | null> {
  try {
    const query = `${place.name}, Hà Nội`;
    const url = `https://places.googleapis.com/v1/places:searchText`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.id,places.formattedAddress,places.googleMapsUri",
      },
      body: JSON.stringify({
        textQuery: query,
        locationBias: {
          circle: {
            center: { latitude: place.lat, longitude: place.lng },
            radius: 2000.0,
          },
        },
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const candidate = data.places?.[0];
    if (candidate) {
      return {
        address: candidate.formattedAddress || cleanAddressText(place.address, place.area),
        googleMapsUrl: candidate.googleMapsUri || buildGoogleMapsSearchUrl({
          name: place.name,
          address: candidate.formattedAddress,
          area: place.area,
          placeId: candidate.id,
        }),
        googlePlaceId: candidate.id ?? null,
        source: "google_places",
      };
    }
  } catch {
    // Fallback sang các tầng tiếp theo
  }
  return null;
}

/**
 * Tier 2: OpenStreetMap Nominatim Reverse Geocoding (Miễn phí, dịch GPS -> Tên đường, phường, quận tại Hà Nội).
 */
async function tryNominatimReverse(
  lat: number,
  lng: number
): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=vi`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "DateMate-App/1.0 (contact: datemate.vn@gmail.com)",
      },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.address) {
      const parts: string[] = [];
      const addr = data.address;
      if (addr.house_number) parts.push(addr.house_number);
      if (addr.road) parts.push(addr.road);
      if (addr.suburb || addr.quarter || addr.neighbourhood) {
        parts.push(addr.suburb || addr.quarter || addr.neighbourhood);
      }
      if (addr.city_district || addr.district || addr.county) {
        parts.push(addr.city_district || addr.district || addr.county);
      }
      parts.push("Hà Nội");

      if (parts.length >= 3) {
        return parts.join(", ");
      }
      if (data.display_name) {
        return data.display_name.split(",").slice(0, 4).join(", ").trim();
      }
    }
  } catch {
    // Ignore error
  }
  return null;
}

/**
 * Tier 3: Gemini Flash AI Address Normalizer (sử dụng GEMINI_API_KEY đã có).
 */
async function tryGeminiAddressNormalizer(
  place: PlaceInputForEnrichment
): Promise<string | null> {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) return null;

  try {
    const ai = new GoogleGenAI({ apiKey: geminiKey });
    const prompt = `Bạn là chuyên gia địa lý và du lịch Hà Nội. Hãy cung cấp địa chỉ chính xác, đầy đủ (gồm số nhà/phố/ngõ, phường, quận, Hà Nội) của địa điểm hẹn hò sau:
- Tên địa điểm: "${place.name}"
- Khu vực: "${place.area || ""}"
- Tọa độ GPS gần đúng: ${place.lat}, ${place.lng}

Chỉ trả về ĐÚNG MỘT DÒNG DUY NHẤT chứa địa chỉ chính xác, không kèm giải thích hay dấu markdown. Ví dụ:
"272 Võ Chí Công, Phú Thượng, Tây Hồ, Hà Nội"`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const text = response.text?.trim().replace(/^["']|["']$/g, "");
    if (text && text.length > 5 && !isGenericAddress(text)) {
      return text;
    }
  } catch {
    // Ignore error
  }
  return null;
}

/**
 * Hàm điều phối Geocoding & Address Enrichment chính:
 * Tự động chọn tầng tối ưu nhất để sinh ra địa chỉ thật và Google Maps POI URL.
 */
export async function enrichPlaceMapInfo(
  place: PlaceInputForEnrichment
): Promise<EnrichedMapData> {
  const googleMapsKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY;

  // 1. Thử Tier 1 nếu có Google Key
  if (googleMapsKey) {
    const googleResult = await tryGoogleMapsApi(place, googleMapsKey);
    if (googleResult) return googleResult;
  }

  let resolvedAddress = place.address;

  // 2. Nếu địa chỉ hiện tại bị generic/placeholder, tra cứu tìm địa chỉ thật
  if (isGenericAddress(resolvedAddress)) {
    // Thử Tier 2: Nominatim Reverse Geocoding từ tọa độ GPS thực tế
    const nominatimAddress = await tryNominatimReverse(place.lat, place.lng);
    if (nominatimAddress && !isGenericAddress(nominatimAddress)) {
      resolvedAddress = nominatimAddress;
      const mapsUrl = buildGoogleMapsSearchUrl({
        name: place.name,
        address: resolvedAddress,
        area: place.area,
        lat: place.lat,
        lng: place.lng,
      });
      return {
        address: resolvedAddress,
        googleMapsUrl: mapsUrl,
        source: "nominatim",
      };
    }

    // Thử Tier 3: Gemini Flash AI
    const aiAddress = await tryGeminiAddressNormalizer(place);
    if (aiAddress) {
      resolvedAddress = aiAddress;
      const mapsUrl = buildGoogleMapsSearchUrl({
        name: place.name,
        address: resolvedAddress,
        area: place.area,
        lat: place.lat,
        lng: place.lng,
      });
      return {
        address: resolvedAddress,
        googleMapsUrl: mapsUrl,
        source: "gemini_ai",
      };
    }
  }

  // 4. Fallback Heuristic
  const finalAddress = cleanAddressText(resolvedAddress, place.area);
  const mapsUrl = buildGoogleMapsSearchUrl({
    name: place.name,
    address: finalAddress,
    area: place.area,
    lat: place.lat,
    lng: place.lng,
  });

  return {
    address: finalAddress,
    googleMapsUrl: mapsUrl,
    source: "heuristic",
  };
}
