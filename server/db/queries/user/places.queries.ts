import { and, asc, eq, inArray, ne, or, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { HIDDEN_SAFETY_PLACE } from "@/lib/constants/catalog";
import {
  placeGuides,
  placeMedia,
  places,
  swipes,
  type Place,
  type PlaceGuide,
  type PlaceMedia,
} from "@/server/db/schema";

export interface PlaceWithGuide {
  place: Place;
  guide: PlaceGuide | null;
}

const isPubliclyVisiblePlace = and(
  eq(places.status, "published"),
  ne(places.slug, HIDDEN_SAFETY_PLACE.slug),
  ne(places.id, HIDDEN_SAFETY_PLACE.id)
);

/** Public catalog: only published places excluding hidden safety entries. */
export async function listPublishedPlacesWithGuides(): Promise<PlaceWithGuide[]> {
  return db
    .select({ place: places, guide: placeGuides })
    .from(places)
    .leftJoin(placeGuides, eq(placeGuides.placeId, places.id))
    .where(isPubliclyVisiblePlace)
    .orderBy(asc(places.name));
}

/** Targeted top-N published places query (for Home curated preview & anonymous deck). */
export async function listPublishedPlacesLimited(limit: number): Promise<PlaceWithGuide[]> {
  if (limit <= 0) return [];
  return db
    .select({ place: places, guide: placeGuides })
    .from(places)
    .leftJoin(placeGuides, eq(placeGuides.placeId, places.id))
    .where(isPubliclyVisiblePlace)
    .orderBy(asc(places.name))
    .limit(limit);
}

/** Fast aggregate count of published places without loading rows. */
export async function countPublishedPlaces(): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`COUNT(*)` })
    .from(places)
    .where(isPubliclyVisiblePlace);
  return Number(row?.total ?? 0);
}

/** Point lookup by primary key `id` or unique `slug` (avoids full-catalog scan). */
export async function findPublishedPlaceWithGuide(
  idOrSlug: string
): Promise<PlaceWithGuide | null> {
  const trimmed = idOrSlug.trim();
  if (
    !trimmed ||
    trimmed === HIDDEN_SAFETY_PLACE.slug ||
    trimmed === HIDDEN_SAFETY_PLACE.id
  ) {
    return null;
  }

  const [row] = await db
    .select({ place: places, guide: placeGuides })
    .from(places)
    .leftJoin(placeGuides, eq(placeGuides.placeId, places.id))
    .where(and(isPubliclyVisiblePlace, or(eq(places.id, trimmed), eq(places.slug, trimmed))))
    .limit(1);

  return row ?? null;
}

/** Batch media query by placeIds (eliminates N+1). */
export async function listMediaByPlaceIds(placeIds: string[]): Promise<PlaceMedia[]> {
  if (placeIds.length === 0) return [];
  return db
    .select()
    .from(placeMedia)
    .where(inArray(placeMedia.placeId, placeIds))
    .orderBy(asc(placeMedia.sortOrder));
}

/** Targeted batch lookup for specific published place IDs. */
export async function listPublishedPlacesByIds(placeIds: string[]): Promise<PlaceWithGuide[]> {
  if (placeIds.length === 0) return [];
  return db
    .select({ place: places, guide: placeGuides })
    .from(places)
    .leftJoin(placeGuides, eq(placeGuides.placeId, places.id))
    .where(and(isPubliclyVisiblePlace, inArray(places.id, placeIds)));
}

/** Pushes swipe exclusion (`NOT EXISTS`) and optional `LIMIT` directly to TiDB SQL. */
export async function listUnswipedPublishedPlacesWithGuides(
  roomId: string,
  memberId: string,
  limit?: number
): Promise<PlaceWithGuide[]> {
  const notSwipedByMember = sql`NOT EXISTS (
    SELECT 1 FROM ${swipes}
    WHERE ${swipes.roomId} = ${roomId}
      AND ${swipes.memberId} = ${memberId}
      AND ${swipes.placeId} = ${places.id}
  )`;

  const baseQuery = db
    .select({ place: places, guide: placeGuides })
    .from(places)
    .leftJoin(placeGuides, eq(placeGuides.placeId, places.id))
    .where(and(isPubliclyVisiblePlace, notSwipedByMember))
    .orderBy(asc(places.name));

  if (typeof limit === "number" && limit > 0) {
    return baseQuery.limit(limit);
  }
  return baseQuery;
}
