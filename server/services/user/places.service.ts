import { isDatabaseConfigured } from "@/server/db/client";
import { listMediaByPlaceIds, listPublishedPlacesWithGuides } from "@/server/db/queries/user/places.queries";
import { toCatalogPlace } from "@/server/services/user/catalog.mapper";
import { HANOI_PLACES } from "@/lib/mock-data";
import { HIDDEN_SAFETY_PLACE } from "@/lib/constants/catalog";
import type { HanoiPlace } from "@/lib/types/catalog";
import type { PlaceMedia } from "@/server/db/schema";
import {
  filterPlaces,
  paginate,
  pickRandomPlace,
  suggestPlaces,
  type PlaceFilters,
  type PlaceSuggestion,
} from "@/lib/catalog-filter";
import { AppError, ERRORS } from "@/server/http/errors";

function getSeedPlaces(): HanoiPlace[] {
  return HANOI_PLACES.filter((place) => place.status === "published");
}

/** Bộ seed chỉ dành cho chế độ demo khi dev; production không được che lỗi DB bằng dữ liệu giả. */
function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Catalog đã xuất bản. Khi dev: chưa có DB, DB chưa seed, hoặc DB lỗi thì dùng bộ seed 36 địa điểm (mục 14).
 * Production: DB rỗng trả rỗng, DB lỗi thì ném lỗi để giám sát phát hiện.
 */
export async function getAllPublishedPlaces(): Promise<HanoiPlace[]> {
  // Chỉ dùng seed data khi chạy test offline hoặc dev chưa cấu hình DB
  if (!isDatabaseConfigured()) {
    if (isProduction()) throw new AppError(ERRORS.COMMON.DB_NOT_CONFIGURED);
    return getSeedPlaces();
  }

  // Khi DB đã cấu hình: TiDB là nguồn chân lý duy nhất (Single Source of Truth)
  const rows = await listPublishedPlacesWithGuides();
  if (rows.length === 0) {
    return [];
  }

  const placeIds = rows.map((r) => r.place.id);
  const mediaRows = await listMediaByPlaceIds(placeIds);

  const mediaByPlaceId = new Map<string, PlaceMedia[]>();
  for (const media of mediaRows) {
    const list = mediaByPlaceId.get(media.placeId) ?? [];
    list.push(media);
    mediaByPlaceId.set(media.placeId, list);
  }

  const now = new Date();
  return rows.map(({ place, guide }) =>
    toCatalogPlace(place, guide, mediaByPlaceId.get(place.id) ?? [], now)
  );
}

export async function findPlaceBySlug(slug: string): Promise<HanoiPlace | null> {
  if (slug === HIDDEN_SAFETY_PLACE.slug) return null;
  const all = await getAllPublishedPlaces();
  return all.find((place) => place.slug === slug) ?? null;
}

/** Guard: chỉ cho thao tác (lưu, vuốt, thêm vào kế hoạch) trên địa điểm đang xuất bản. */
export async function requirePublishedPlace(placeIdOrSlug: string): Promise<HanoiPlace> {
  const all = await getAllPublishedPlaces();
  const place = all.find((candidate) => candidate.id === placeIdOrSlug || candidate.slug === placeIdOrSlug);
  if (!place) throw new AppError(ERRORS.PLACE.NOT_FOUND);
  return place;
}

export async function queryPlaces(filters: PlaceFilters, cursor?: string, limit: number = 12) {
  const all = await getAllPublishedPlaces();
  return paginate(filterPlaces(all, filters), cursor, limit);
}

export async function getRandomCandidate(excludeSlugs: string[] = [], filter?: PlaceFilters): Promise<HanoiPlace | null> {
  const all = await getAllPublishedPlaces();
  const pool = filter ? filterPlaces(all, filter) : all;
  return pickRandomPlace(pool, excludeSlugs);
}

export async function getPlaceSuggestions(query: string, limit: number): Promise<PlaceSuggestion[]> {
  const all = await getAllPublishedPlaces();
  return suggestPlaces(all, query, limit);
}
