// Lọc và chấm điểm ứng viên ảnh Bing cho một địa điểm (logic thuần, không I/O).
import type { BingImageResult } from "./bing-image-search";

export interface PlaceForPhotoMatch {
  name: string;
  area?: string | null;
}

export interface ScoredCandidate extends BingImageResult {
  score: number;
}

export type RejectReason = "blocked_host" | "bad_extension" | "reject_keyword";

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
  "vnexpress.net",
  "kenh14.vn",
  "tripadvisor.com",
  "tripadvisor.com.vn",
  "mia.vn",
  "vietnamtourism.gov.vn",
];

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
  const nameTokens = normalizeVi(place.name).split(" ").filter(Boolean);
  let distinctive = nameTokens.filter((t) => t.length >= 2 && !GENERIC_NAME_TOKENS.has(t));
  if (distinctive.length === 0) distinctive = nameTokens; // fallback: tên toàn từ chung
  if (distinctive.length > 0) {
    const tokenSet = new Set(tokens);
    const coverage = distinctive.filter((t) => tokenSet.has(t)).length / distinctive.length;
    if (coverage >= 0.6) score += 2;
    else if (coverage >= 0.34) score += 1;
  }

  if (hasPhrase(tokens, "ha noi") || hasPhrase(tokens, "hanoi")) score += 1;
  if (OTHER_CITIES.some((city) => hasPhrase(tokens, city))) score -= 3;
  if (pageUrl && hostMatches(pageUrl.hostname.toLowerCase(), TRUSTED_PAGE_HOSTS)) score += 1;

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
