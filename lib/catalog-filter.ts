import type { MoodKey, PlaceCategory } from "@/lib/constants/catalog";
import { normalizeVietnamese, scoreSearchMatch } from "@/lib/search";
import type { HanoiPlace } from "@/lib/types/catalog";

export interface PlaceFilters {
  mood?: MoodKey;
  category?: PlaceCategory;
  price?: number;
  area?: string;
  indoor?: boolean;
  q?: string;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

/** Từ khóa người dùng hay gõ → tên chuẩn trong catalog. */
const SEARCH_ALIASES: Record<string, string> = {
  "ho guom": "ho hoan kiem",
};

/** Mục 14.2: phố cà phê đường tàu đã bị cấm, chỉ hiện cảnh báo + gợi ý thay thế. */
const TRAIN_STREET_KEYWORDS = ["duong tau", "ray tau", "train street", "tau hoa"];

export function isTrainStreetQuery(query: string): boolean {
  const normalized = normalizeVietnamese(query);
  return TRAIN_STREET_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

export function normalizeSearchQuery(query: string): string {
  const normalized = normalizeVietnamese(query);
  return Object.entries(SEARCH_ALIASES).reduce(
    (acc, [alias, canonical]) => acc.replace(alias, canonical),
    normalized
  );
}

function toSearchableText(place: HanoiPlace): string {
  return normalizeVietnamese(
    `${place.name} ${place.area} ${place.categoryLabel} ${place.summary} ${place.moodLabels.join(" ")}`
  );
}

function matchesFilters(place: HanoiPlace, filters: PlaceFilters): boolean {
  if (filters.mood && !place.moods.includes(filters.mood)) return false;
  if (filters.category && place.category !== filters.category) return false;
  if (filters.price !== undefined && place.priceLevel > filters.price) return false;
  if (filters.indoor !== undefined && place.indoor !== filters.indoor) return false;
  if (filters.area && !normalizeVietnamese(place.area).includes(normalizeVietnamese(filters.area))) return false;
  return true;
}

/**
 * Lọc catalog theo bộ lọc F03; có từ khóa thì yêu cầu khớp đủ mọi từ và xếp theo độ liên quan.
 */
export function filterPlaces(places: HanoiPlace[], filters: PlaceFilters): HanoiPlace[] {
  const filtered = places.filter((place) => matchesFilters(place, filters));
  const query = filters.q ? normalizeSearchQuery(filters.q) : "";
  if (!query) return filtered;

  const words = query.split(" ").filter(Boolean);
  return filtered
    .map((place) => ({ place, text: toSearchableText(place) }))
    .filter(({ text }) => words.every((word) => text.includes(word)))
    .map(({ place, text }) => ({ place, score: scoreSearchMatch(query, normalizeVietnamese(place.name), text) }))
    .sort((a, b) => b.score - a.score)
    .map(({ place }) => place);
}

/** Cursor là offset dạng chuỗi; catalog nhỏ (≤ vài trăm bản ghi) và thứ tự ổn định. */
export function paginate<T>(items: T[], cursor: string | undefined, limit: number): Page<T> {
  const offset = cursor ? Number(cursor) : 0;
  const pageItems = items.slice(offset, offset + limit);
  const nextOffset = offset + pageItems.length;
  return {
    items: pageItems,
    nextCursor: nextOffset < items.length ? String(nextOffset) : null,
  };
}

export interface PlaceSuggestion {
  slug: string;
  name: string;
  area: string;
}

const PREFIX_OF_NAME_RANK = 2;
const PREFIX_OF_WORD_RANK = 1;

function rankSuggestion(nameNorm: string, query: string): number {
  if (nameNorm.startsWith(query)) return PREFIX_OF_NAME_RANK;
  if (` ${nameNorm}`.includes(` ${query}`)) return PREFIX_OF_WORD_RANK;
  return 0;
}

/**
 * F22 autocomplete: khớp tiền tố tên (bỏ dấu); đầu tên xếp trước, đầu một từ bất kỳ xếp sau.
 */
export function suggestPlaces(
  places: Pick<HanoiPlace, "slug" | "name" | "area">[],
  query: string,
  limit: number
): PlaceSuggestion[] {
  const normalized = normalizeSearchQuery(query);
  if (!normalized) return [];

  return places
    .map((place) => ({ place, rank: rankSuggestion(normalizeVietnamese(place.name), normalized) }))
    .filter(({ rank }) => rank > 0)
    .sort((a, b) => b.rank - a.rank || a.place.name.localeCompare(b.place.name, "vi"))
    .slice(0, limit)
    .map(({ place }) => ({ slug: place.slug, name: place.name, area: place.area }));
}

/**
 * F06: chọn ngẫu nhiên 1 địa điểm, tránh các slug vừa ra; hết ứng viên thì quay lại toàn bộ.
 */
export function pickRandomPlace<P extends { slug: string }>(
  places: P[],
  excludeSlugs: string[],
  random: () => number = Math.random
): P | null {
  if (places.length === 0) return null;
  const excluded = new Set(excludeSlugs);
  const remaining = places.filter((place) => !excluded.has(place.slug));
  const pool = remaining.length > 0 ? remaining : places;
  return pool[Math.floor(random() * pool.length)];
}
