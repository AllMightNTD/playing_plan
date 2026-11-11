// Lọc và chấm điểm ứng viên ảnh Bing cho một địa điểm (logic thuần, không I/O).
import type { BingImageResult } from "./bing-image-search";

export interface PlaceForPhotoMatch {
  name: string;
  area?: string | null;
}

export interface ScoredCandidate extends BingImageResult {
  score: number;
}

export type RejectReason = "blocked_host" | "bad_extension" | "reject_keyword" | "missing_food_context";

const BLOCKED_HOST_SUFFIXES = [
  "fbcdn.net",
  "fbsbx.com",
  "cdninstagram.com",
  "instagram.com",
  "tiktokcdn.com",
  "tiktokcdn-us.com",
  "pinimg.com",
];
const REJECT_KEYWORDS = ["logo", "menu", "thuc don", "bang gia", "voucher", "tuyen dung", "ban do", "map", "qr"];
const GENERIC_NAME_TOKENS = new Set([
  "cafe", "coffee", "ca", "phe", "caphe", "quan", "nha", "hang", "restaurant",
  "bar", "ha", "noi", "hanoi", "the", "and", "va", "tiem",
]);
const OTHER_CITIES = ["sai gon", "saigon", "ho chi minh", "hcm", "tphcm", "da nang", "da lat", "hoi an", "nha trang"];
const TRUSTED_PAGE_HOSTS = [
  "foody.vn",
  "shopeefood.vn",
  "riviu.vn",
  "riviu.co",
  "caphe.vn",
  "vnexpress.net",
  "kenh14.vn",
  "tripadvisor.com",
  "tripadvisor.com.vn",
  "mia.vn",
  "vietnamtourism.gov.vn",
];
const TRUSTED_FOOD_CDN_HOSTS = [
  "susercontent.com",
  "foody.vn",
  "riviu.vn",
  "riviu.co",
];
const FOOD_AND_LOCATION_TOKENS = new Set([
  "cafe", "coffee", "ca", "phe", "caphe", "quan", "tiem", "nha", "hang", "restaurant",
  "bar", "pub", "tra", "sua", "an", "uong", "do", "mon", "am", "thuc", "food",
  "bakery", "cocktail", "bistro", "lounge", "ha", "noi", "hanoi", "vietnam",
  "cau", "giay", "hoan", "kiem", "ba", "dinh", "dong", "da", "tay", "ho", "hai", "trung",
  "thanh", "xuan", "ha", "dong", "nam", "tu", "liem", "bac", "tu", "liem", "long", "bien",
  "hoang", "mai", "gia", "lam", "soc", "son", "ba", "vi"
]);

/** Lowercase, bỏ dấu, đ→d, ký tự không phải chữ/số thành space, gộp space. */
export function normalizeVi(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Parse URL an toàn: lỗi/null thì trả về null, không throw
function parseUrl(url: string | null): URL | null {
  if (!url) return null;
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

function hostMatches(host: string, suffixes: string[]): boolean {
  return suffixes.some((s) => host === s || host.endsWith("." + s));
}

// Token kèm 2 dạng: `raw` giữ dấu (lowercase), `bare` đã bỏ dấu như normalizeVi
interface AccentToken {
  raw: string;
  bare: string;
}

const COMBINING_MARKS = /[\u0300-\u036f]/g;

/** Tách token giữ dấu và căn cặp với dạng bỏ dấu. */
function accentTokens(text: string): AccentToken[] {
  const out: AccentToken[] = [];
  for (const raw of text.normalize("NFC").toLowerCase().split(/[^\p{L}\p{M}\p{N}]+/u)) {
    if (!raw) continue;
    const pieces = normalizeVi(raw).split(" ").filter(Boolean);
    // Ký tự lạ làm token vỡ ra nhiều mảnh: coi từng mảnh là không dấu
    if (pieces.length === 1) out.push({ raw, bare: pieces[0] });
    else for (const p of pieces) out.push({ raw: p, bare: p });
  }
  return out;
}

function hasDiacritics(raw: string): boolean {
  return /[\u0300-\u036fđ]/.test(raw.normalize("NFD"));
}

// Khóa so dấu: chữ gốc (giữ đ) + tập dấu đã sort, để "hoà" và "hòa" (bỏ dấu kiểu cũ/mới) là một
function accentKey(raw: string): string {
  const nfd = raw.normalize("NFD");
  const marks = (nfd.match(COMBINING_MARKS) ?? []).sort().join("");
  return `${nfd.replace(COMBINING_MARKS, "")}|${marks}`;
}

/**
 * Token tên khớp token haystack khi bỏ dấu bằng nhau VÀ (một bên không dấu hoặc dấu giống nhau).
 * Tránh "Cộng" khớp "Công"/"cổng", nhưng vẫn khớp title không dấu "Cong".
 */
function tokenMatches(name: AccentToken, hay: AccentToken): boolean {
  if (name.bare !== hay.bare) return false;
  if (!hasDiacritics(name.raw) || !hasDiacritics(hay.raw)) return true;
  return accentKey(name.raw) === accentKey(hay.raw);
}

// Có cụm token liên tiếp (đã normalize) trong danh sách token không
function hasPhrase(tokens: string[], phrase: string): boolean {
  const p = phrase.split(" ");
  for (let i = 0; i + p.length <= tokens.length; i++) {
    if (p.every((w, j) => tokens[i + j] === w)) return true;
  }
  return false;
}

export function scoreImageCandidate(
  c: BingImageResult,
  place: PlaceForPhotoMatch,
): { score: number; rejectReason: RejectReason | null } {
  const imageUrl = parseUrl(c.imageUrl);
  const pageUrl = parseUrl(c.pageUrl);

  if (imageUrl && hostMatches(imageUrl.hostname.toLowerCase(), BLOCKED_HOST_SUFFIXES)) {
    return { score: 0, rejectReason: "blocked_host" };
  }
  if (imageUrl && /\.(svg|gif)$/i.test(imageUrl.pathname)) {
    return { score: 0, rejectReason: "bad_extension" };
  }

  const tokens = normalizeVi(`${c.title} ${pageUrl?.pathname ?? ""} ${imageUrl?.pathname ?? ""}`)
    .split(" ")
    .filter(Boolean);

  if (REJECT_KEYWORDS.some((k) => hasPhrase(tokens, k))) {
    return { score: 0, rejectReason: "reject_keyword" };
  }

  let score = 0;
  const nameTokens = accentTokens(place.name);
  let distinctive = nameTokens.filter((t) => t.bare.length >= 2 && !GENERIC_NAME_TOKENS.has(t.bare));
  if (distinctive.length === 0) distinctive = nameTokens; // fallback: tên toàn từ chung

  if (distinctive.length > 0) {
    // Độ phủ tên so theo dấu: title giữ dấu, path URL coi như không dấu
    const pathBare = normalizeVi(`${pageUrl?.pathname ?? ""} ${imageUrl?.pathname ?? ""}`)
      .split(" ")
      .filter(Boolean);
    const haystack = [...accentTokens(c.title), ...pathBare.map((bare) => ({ raw: bare, bare }))];
    const covered = distinctive.filter((n) => haystack.some((h) => tokenMatches(n, h))).length;
    const coverage = covered / distinctive.length;

    // Chống false positive tên viết tắt/tên ngắn: nếu toàn bộ từ phân biệt đều ngắn (<= 4 ký tự, vd "Aha", "Mộc"),
    // và có khớp tên, bắt buộc tiêu đề/URL phải chứa ít nhất 1 từ định danh ngành ẩm thực hoặc địa danh.
    const isShortName = distinctive.length === 1 && distinctive[0].bare.length <= 4;
    if (coverage > 0 && isShortName) {
      const hasFoodOrLocation = tokens.some((t) => FOOD_AND_LOCATION_TOKENS.has(t));
      if (!hasFoodOrLocation) {
        return { score: 0, rejectReason: "missing_food_context" };
      }
    }

    if (coverage >= 0.6) score += 2;
    else if (coverage >= 0.34) score += 1;
  }

  if (hasPhrase(tokens, "ha noi") || hasPhrase(tokens, "hanoi")) score += 1;
  // Bỏ qua thành phố có sẵn trong tên (vd "Cafe Sài Gòn Xưa" ở Hà Nội)
  const nameBare = nameTokens.map((t) => t.bare);
  if (OTHER_CITIES.some((city) => !hasPhrase(nameBare, city) && hasPhrase(tokens, city))) score -= 3;
  if (pageUrl && hostMatches(pageUrl.hostname.toLowerCase(), TRUSTED_PAGE_HOSTS)) score += 1;
  if (imageUrl && hostMatches(imageUrl.hostname.toLowerCase(), TRUSTED_FOOD_CDN_HOSTS)) score += 2;

  return { score, rejectReason: null };
}

export function rankImageCandidates(results: BingImageResult[], place: PlaceForPhotoMatch): ScoredCandidate[] {
  const scored: ScoredCandidate[] = [];
  for (const r of results) {
    const { score, rejectReason } = scoreImageCandidate(r, place);
    if (rejectReason === null && score >= 2) scored.push({ ...r, score });
  }
  return scored.sort((a, b) => b.score - a.score || a.rank - b.rank);
}
