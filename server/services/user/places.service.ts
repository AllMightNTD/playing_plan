import { isDatabaseConfigured } from "@/server/db/client";
import { getUserRepositories } from "@/server/db/repositories";
import {
  countPublishedPlaces,
  findPublishedPlaceWithGuide,
  listMediaByPlaceIds,
  listPublishedPlacesByIds,
  listPublishedPlacesLimited,
  listPublishedPlacesWithGuides,
  listUnswipedPublishedPlacesWithGuides,
  type PlaceWithGuide,
} from "@/server/db/queries/user/places.queries";
import { toCatalogPlace } from "@/server/services/user/catalog.mapper";
import { HIDDEN_SAFETY_PLACE } from "@/lib/constants/catalog";
import { filterPlacesByHobby } from "@/lib/catalog/hobby-filter";
import { getWeatherRecommendation } from "@/lib/weather-recommendation";
import type { WeatherData } from "@/lib/weather";
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
import { SAMPLE_PLACES } from "@/server/test-fixtures/sample-places";

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function getLocalFallbackPlaces(): HanoiPlace[] {
  return SAMPLE_PLACES.filter((p) => p.status === "published");
}

async function hydrateCatalogPlaces(rows: PlaceWithGuide[]): Promise<HanoiPlace[]> {
  if (rows.length === 0) return [];

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

/**
 * Full published catalog (used for full-text search/suggestions/filter pagination).
 */
export async function getAllPublishedPlaces(): Promise<HanoiPlace[]> {
  if (!isDatabaseConfigured()) {
    if (isProduction()) {
      throw new AppError(ERRORS.COMMON.DB_NOT_CONFIGURED);
    }
    return getLocalFallbackPlaces();
  }

  const rows = await listPublishedPlacesWithGuides();
  return hydrateCatalogPlaces(rows);
}

/**
 * Batch lookup of published places by IDs (deduplicated, zero full-table scan).
 */
export async function getPublishedPlacesByIds(placeIds: string[]): Promise<HanoiPlace[]> {
  const uniqueIds = Array.from(new Set(placeIds.filter(Boolean)));
  if (uniqueIds.length === 0) return [];

  if (!isDatabaseConfigured()) {
    if (isProduction()) {
      throw new AppError(ERRORS.COMMON.DB_NOT_CONFIGURED);
    }
    const set = new Set(uniqueIds);
    return getLocalFallbackPlaces().filter((p) => set.has(p.id));
  }

  const rows = await listPublishedPlacesByIds(uniqueIds);
  return hydrateCatalogPlaces(rows);
}

/**
 * Home public preview: COUNT(*) + top-N curated places evaluated by current weather.
 */
export async function getHomeCatalogPreview(
  limit: number = 3,
  weather?: WeatherData
): Promise<{ totalPlaces: number; curatedPlaces: HanoiPlace[] }> {
  if (!isDatabaseConfigured()) {
    if (isProduction()) {
      throw new AppError(ERRORS.COMMON.DB_NOT_CONFIGURED);
    }
    const places = getLocalFallbackPlaces();
    const curated = weather
      ? getWeatherRecommendation(places, weather, { limit }).places
      : places.slice(0, limit);
    return { totalPlaces: places.length, curatedPlaces: curated };
  }

  const candidateLimit = weather ? Math.max(limit * 8, 24) : limit;
  const [totalPlaces, topRows] = await Promise.all([
    countPublishedPlaces(),
    listPublishedPlacesLimited(candidateLimit),
  ]);
  const hydrated = await hydrateCatalogPlaces(topRows);
  const curatedPlaces = weather
    ? getWeatherRecommendation(hydrated, weather, { limit }).places
    : hydrated.slice(0, limit);

  return { totalPlaces, curatedPlaces };
}

/**
 * Swipe deck loader pushing `NOT EXISTS` + `LIMIT` down to SQL when TiDB is configured.
 */
export async function getUnswipedPublishedPlaces(
  session: { roomId: string; memberId: string } | null,
  limit: number,
  hobby?: string
): Promise<HanoiPlace[]> {
  if (limit <= 0) return [];
  const hasHobbyFilter = Boolean(hobby && hobby.trim() && hobby !== "all");

  if (!isDatabaseConfigured()) {
    if (isProduction()) {
      throw new AppError(ERRORS.COMMON.DB_NOT_CONFIGURED);
    }
    const all = getLocalFallbackPlaces();
    const withHobby = hasHobbyFilter ? filterPlacesByHobby(all, hobby) : all;
    if (!session) {
      return withHobby.slice(0, limit);
    }
    const swipedIds = new Set(
      await getUserRepositories().swipes.listSwipedPlaceIds(session.roomId, session.memberId)
    );
    return withHobby.filter((p) => !swipedIds.has(p.id)).slice(0, limit);
  }

  if (!session) {
    if (!hasHobbyFilter) {
      const rows = await listPublishedPlacesLimited(limit);
      return hydrateCatalogPlaces(rows);
    }
    const all = await getAllPublishedPlaces();
    return filterPlacesByHobby(all, hobby).slice(0, limit);
  }

  if (!hasHobbyFilter) {
    const rows = await listUnswipedPublishedPlacesWithGuides(session.roomId, session.memberId, limit);
    return hydrateCatalogPlaces(rows);
  }

  const unswipedRows = await listUnswipedPublishedPlacesWithGuides(session.roomId, session.memberId);
  const unswipedPlaces = await hydrateCatalogPlaces(unswipedRows);
  return filterPlacesByHobby(unswipedPlaces, hobby).slice(0, limit);
}

/** Point lookup by slug (1-row index query instead of full-catalog scan). */
export async function findPlaceBySlug(slug: string): Promise<HanoiPlace | null> {
  if (!slug || slug === HIDDEN_SAFETY_PLACE.slug) return null;

  if (!isDatabaseConfigured()) {
    if (isProduction()) {
      throw new AppError(ERRORS.COMMON.DB_NOT_CONFIGURED);
    }
    return getLocalFallbackPlaces().find((p) => p.slug === slug) ?? null;
  }

  const row = await findPublishedPlaceWithGuide(slug);
  if (!row) return null;
  const [hydrated] = await hydrateCatalogPlaces([row]);
  return hydrated ?? null;
}

/** Guard: verifies a place is published by ID or slug via point lookup. */
export async function requirePublishedPlace(placeIdOrSlug: string): Promise<HanoiPlace> {
  if (
    !placeIdOrSlug ||
    placeIdOrSlug === HIDDEN_SAFETY_PLACE.slug ||
    placeIdOrSlug === HIDDEN_SAFETY_PLACE.id
  ) {
    throw new AppError(ERRORS.PLACE.NOT_FOUND);
  }

  if (!isDatabaseConfigured()) {
    if (isProduction()) {
      throw new AppError(ERRORS.COMMON.DB_NOT_CONFIGURED);
    }
    const fallback = getLocalFallbackPlaces().find(
      (p) => p.id === placeIdOrSlug || p.slug === placeIdOrSlug
    );
    if (!fallback) throw new AppError(ERRORS.PLACE.NOT_FOUND);
    return fallback;
  }

  const row = await findPublishedPlaceWithGuide(placeIdOrSlug);
  if (!row) throw new AppError(ERRORS.PLACE.NOT_FOUND);
  const [hydrated] = await hydrateCatalogPlaces([row]);
  if (!hydrated) throw new AppError(ERRORS.PLACE.NOT_FOUND);
  return hydrated;
}

export async function queryPlaces(filters: PlaceFilters, cursor?: string, limit: number = 12) {
  const all = await getAllPublishedPlaces();
  return paginate(filterPlaces(all, filters), cursor, limit);
}

export async function getRandomCandidate(
  excludeSlugs: string[] = [],
  filter?: PlaceFilters
): Promise<HanoiPlace | null> {
  const all = await getAllPublishedPlaces();
  const pool = filter ? filterPlaces(all, filter) : all;
  return pickRandomPlace(pool, excludeSlugs);
}

export async function getPlaceSuggestions(query: string, limit: number): Promise<PlaceSuggestion[]> {
  const all = await getAllPublishedPlaces();
  return suggestPlaces(all, query, limit);
}
