import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/server/db/client";
import { placeGuides, placeMedia, places, type Place, type PlaceGuide, type PlaceMedia } from "@/server/db/schema";

export interface PlaceWithGuide {
  place: Place;
  guide: PlaceGuide | null;
}

/** Catalog công khai: chỉ địa điểm đã xuất bản (AC F03). */
export async function listPublishedPlacesWithGuides(): Promise<PlaceWithGuide[]> {
  return db
    .select({ place: places, guide: placeGuides })
    .from(places)
    .leftJoin(placeGuides, eq(placeGuides.placeId, places.id))
    .where(eq(places.status, "published"))
    .orderBy(asc(places.name));
}

/** Batch query lấy danh sách media theo danh sách placeIds (tránh N+1). */
export async function listMediaByPlaceIds(placeIds: string[]): Promise<PlaceMedia[]> {
  if (placeIds.length === 0) return [];
  return db
    .select()
    .from(placeMedia)
    .where(inArray(placeMedia.placeId, placeIds))
    .orderBy(asc(placeMedia.sortOrder));
}

