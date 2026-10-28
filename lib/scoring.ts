import {
  CATEGORY_BEST_SLOTS,
  MOOD_LABELS,
  type MoodKey,
  type PlaceCategory,
  type TimeSlot,
  type TransportMode,
} from "@/lib/constants/catalog";

export interface ScorablePlace {
  slug: string;
  category: PlaceCategory;
  priceLevel: number;
  moods: string[];
  indoor: boolean;
  costText: string;
  bestTimeText: string;
  lat?: number;
  lng?: number;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface RecommendCriteria {
  budget: number;
  moods: MoodKey[];
  slot: TimeSlot;
  transport: TransportMode;
  isRainy?: boolean;
  origin?: GeoPoint;
}

export interface ScoredPlace<P extends ScorablePlace> {
  place: P;
  score: number;
  reasons: string[];
}

export interface RecommendOptions {
  limit?: number;
  excludeSlugs?: string[];
  random?: () => number;
}

/** Điểm tối đa từng tiêu chí theo spec F05. */
export const SCORE_WEIGHTS = {
  mood: 35,
  budget: 20,
  slot: 15,
  distance: 10,
  weather: 10,
} as const;

const BUDGET_STRETCH_POINTS = 8;
const PARTIAL_SLOT_POINTS = 8;
const FULL_DAY_MIN_SLOTS = 3;
const DEFAULT_LIMIT = 3;
const TOP_POOL_SIZE = 10;
const RANK_JITTER = 6;
const EARTH_RADIUS_KM = 6371;
const MAX_DISTANCE_KM: Record<TransportMode, number> = { walk: 1.5, motorbike: 10, car: 20 };

/** null = tiêu chí không áp dụng (thiếu dữ liệu đầu vào), bị loại khỏi mẫu số. */
type CriterionResult = { points: number; max: number; reason?: string } | null;

function scoreMood(place: ScorablePlace, criteria: RecommendCriteria): CriterionResult {
  const matched = criteria.moods.filter((mood) => place.moods.includes(mood));
  if (matched.length === 0) return { points: 0, max: SCORE_WEIGHTS.mood };
  return {
    points: (SCORE_WEIGHTS.mood * matched.length) / criteria.moods.length,
    max: SCORE_WEIGHTS.mood,
    reason: `Khớp mood ${matched.map((mood) => MOOD_LABELS[mood]).join(", ")}`,
  };
}

function scoreBudget(place: ScorablePlace, criteria: RecommendCriteria): CriterionResult {
  const max = SCORE_WEIGHTS.budget;
  if (place.priceLevel <= criteria.budget) {
    return { points: max, max, reason: `Vừa ngân sách (${place.costText})` };
  }
  if (place.priceLevel === criteria.budget + 1) {
    return { points: BUDGET_STRETCH_POINTS, max, reason: `Nhỉnh hơn ngân sách chút (${place.costText})` };
  }
  return { points: 0, max };
}

function scoreSlot(place: ScorablePlace, criteria: RecommendCriteria): CriterionResult {
  const max = SCORE_WEIGHTS.slot;
  const bestSlots = CATEGORY_BEST_SLOTS[place.category];
  if (criteria.slot === "allday") {
    const fitsWholeDay = bestSlots.length >= FULL_DAY_MIN_SLOTS;
    return { points: fitsWholeDay ? max : PARTIAL_SLOT_POINTS, max };
  }
  if (!bestSlots.includes(criteria.slot)) return { points: 0, max };
  return { points: max, max, reason: place.bestTimeText };
}

function scoreWeather(place: ScorablePlace, criteria: RecommendCriteria): CriterionResult {
  if (criteria.isRainy === undefined) return null;
  const max = SCORE_WEIGHTS.weather;
  if (!criteria.isRainy) return { points: max, max };
  if (!place.indoor) return { points: 0, max };
  return { points: max, max, reason: "Trong nhà, không lo mưa" };
}

function haversineKm(from: GeoPoint, to: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

function scoreDistance(place: ScorablePlace, criteria: RecommendCriteria): CriterionResult {
  if (!criteria.origin || place.lat === undefined || place.lng === undefined) return null;
  const max = SCORE_WEIGHTS.distance;
  const distanceKm = haversineKm(criteria.origin, { lat: place.lat, lng: place.lng });
  const maxKm = MAX_DISTANCE_KM[criteria.transport];
  if (distanceKm > maxKm) return { points: 0, max };
  return {
    points: max * (1 - distanceKm / maxKm),
    max,
    reason: `Cách khoảng ${distanceKm.toFixed(1)} km`,
  };
}

/**
 * Chấm điểm 1 địa điểm, trả về % trên tổng điểm của các tiêu chí áp dụng được.
 */
export function scorePlace<P extends ScorablePlace>(place: P, criteria: RecommendCriteria): ScoredPlace<P> {
  const results = [
    scoreMood(place, criteria),
    scoreBudget(place, criteria),
    scoreSlot(place, criteria),
    scoreWeather(place, criteria),
    scoreDistance(place, criteria),
  ].filter((result): result is NonNullable<CriterionResult> => result !== null);

  const earned = results.reduce((sum, result) => sum + result.points, 0);
  const max = results.reduce((sum, result) => sum + result.max, 0);

  return {
    place,
    score: Math.round((earned / max) * 100),
    reasons: results.flatMap((result) => (result.reason ? [result.reason] : [])),
  };
}

/**
 * Lọc ứng viên theo ngân sách + mood; thiếu kết quả thì nới ngân sách trước, rồi tới mood (AC F05).
 */
export function selectCandidates<P extends ScorablePlace>(places: P[], criteria: RecommendCriteria, limit: number): P[] {
  const fitsBudget = (place: P) => place.priceLevel <= criteria.budget;
  const fitsMood = (place: P) => place.moods.some((mood) => criteria.moods.includes(mood as MoodKey));

  const strict = places.filter((place) => fitsBudget(place) && fitsMood(place));
  if (strict.length >= limit) return strict;

  const moodOnly = places.filter(fitsMood);
  if (moodOnly.length >= limit) return moodOnly;

  return places;
}

/**
 * Chọn ưu tiên danh mục chưa có, rồi lấp chỗ trống theo thứ hạng.
 */
export function pickDiverseByCategory<P extends ScorablePlace>(ranked: ScoredPlace<P>[], limit: number): ScoredPlace<P>[] {
  const picked: ScoredPlace<P>[] = [];
  const usedCategories = new Set<PlaceCategory>();

  for (const item of ranked) {
    if (picked.length >= limit) break;
    if (usedCategories.has(item.place.category)) continue;
    picked.push(item);
    usedCategories.add(item.place.category);
  }

  for (const item of ranked) {
    if (picked.length >= limit) break;
    if (!picked.includes(item)) picked.push(item);
  }

  return picked;
}

/**
 * Orchestrator Wizard F05: loại trừ → lọc ứng viên → chấm điểm → xếp hạng có nhiễu nhẹ → chọn đa dạng.
 */
export function recommendPlaces<P extends ScorablePlace>(
  places: P[],
  criteria: RecommendCriteria,
  options: RecommendOptions = {}
): ScoredPlace<P>[] {
  const { limit = DEFAULT_LIMIT, excludeSlugs = [], random = Math.random } = options;
  const excluded = new Set(excludeSlugs);
  const remaining = places.filter((place) => !excluded.has(place.slug));
  const pool = remaining.length > 0 ? remaining : places;

  const ranked = selectCandidates(pool, criteria, limit)
    .map((place) => scorePlace(place, criteria))
    .map((scored) => ({ scored, rank: scored.score + random() * RANK_JITTER }))
    .sort((a, b) => b.rank - a.rank)
    .slice(0, TOP_POOL_SIZE)
    .map(({ scored }) => scored);

  return pickDiverseByCategory(ranked, limit);
}
