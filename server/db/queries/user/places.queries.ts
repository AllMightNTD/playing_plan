import { asc, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { placeGuides, places, type Place, type PlaceGuide } from "@/server/db/schema";

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
