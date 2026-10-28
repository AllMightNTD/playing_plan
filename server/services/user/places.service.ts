import { isDatabaseConfigured } from "@/server/db/client";
import { listPublishedPlacesWithGuides } from "@/server/db/queries/user/places.queries";
import { toCatalogPlace } from "@/server/services/user/catalog.mapper";
import { HANOI_PLACES, HIDDEN_SAFETY_PLACE } from "@/lib/mock-data";
import type { HanoiPlace } from "@/lib/types/catalog";
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

/**
 * Catalog đã xuất bản. Chưa có DB, hoặc DB chưa seed địa điểm nào, thì dùng bộ seed 36 địa điểm (mục 14).
 */
export async function getAllPublishedPlaces(): Promise<HanoiPlace[]> {
  if (!isDatabaseConfigured()) return getSeedPlaces();

  const rows = await listPublishedPlacesWithGuides();
  if (rows.length === 0) return getSeedPlaces();

  const now = new Date();
  return rows.map(({ place, guide }) => toCatalogPlace(place, guide, now));
}

export async function findPlaceBySlug(slug: string): Promise<HanoiPlace | null> {
  if (slug === HIDDEN_SAFETY_PLACE.slug) return null;
  const all = await getAllPublishedPlaces();
  return all.find((place) => place.slug === slug) ?? null;
}

/** Guard: chỉ cho thao tác (lưu, vuốt, thêm vào kế hoạch) trên địa điểm đang xuất bản. */
export async function requirePublishedPlace(placeId: string): Promise<HanoiPlace> {
  const all = await getAllPublishedPlaces();
  const place = all.find((candidate) => candidate.id === placeId);
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
