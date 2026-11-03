import { db } from "@/server/db/client";
import { places } from "@/server/db/schema/places";
import { eq, or, like } from "drizzle-orm";
import { AppError, ERRORS } from "@/server/http/errors";
import { enrichPlaceMapInfo, isGenericAddress } from "@/server/services/maps/geocoding.service";
import { revalidatePlaceCatalog } from "@/server/services/cache/revalidation";

export interface EnrichBatchOptions {
  limit?: number;
  onlyGeneric?: boolean;
}

export async function enrichSinglePlaceMap(placeId: string) {
  const [place] = await db
    .select()
    .from(places)
    .where(eq(places.id, placeId))
    .limit(1);

  if (!place) {
    throw new AppError(ERRORS.PLACE.NOT_FOUND);
  }

  const enriched = await enrichPlaceMapInfo({
    id: place.id,
    name: place.name,
    address: place.address,
    area: place.area,
    lat: Number(place.lat),
    lng: Number(place.lng),
    category: place.category,
  });

  await db
    .update(places)
    .set({
      address: enriched.address,
      googleMapsUrl: enriched.googleMapsUrl,
      googlePlaceId: enriched.googlePlaceId ?? place.googlePlaceId,
      updatedAt: new Date(),
    })
    .where(eq(places.id, placeId));

  await revalidatePlaceCatalog(place.slug);

  return {
    placeId,
    name: place.name,
    oldAddress: place.address,
    newAddress: enriched.address,
    googleMapsUrl: enriched.googleMapsUrl,
    source: enriched.source,
  };
}

export async function enrichPlacesMapBatch(options: EnrichBatchOptions = {}) {
  const limit = Math.min(options.limit ?? 50, 100);
  const onlyGeneric = options.onlyGeneric ?? true;

  let query = db.select().from(places);

  if (onlyGeneric) {
    query = query.where(
      or(
        like(places.address, "Hà Nội (%)"),
        eq(places.address, "Hoàn Kiếm, Hà Nội"),
        eq(places.address, "Ba Đình, Hà Nội"),
        eq(places.address, "Tây Hồ, Hà Nội"),
        eq(places.address, "Long Biên, Hà Nội"),
        eq(places.address, "Gia Lâm, Hà Nội"),
        eq(places.address, "Đống Đa, Hà Nội"),
        eq(places.address, "Cầu Giấy, Hà Nội")
      )
    ) as typeof query;
  }

  const candidateList = await query.limit(limit);

  const results: Array<{
    placeId: string;
    name: string;
    address: string;
    googleMapsUrl: string;
    source: string;
  }> = [];

  for (const item of candidateList) {
    const enriched = await enrichPlaceMapInfo({
      id: item.id,
      name: item.name,
      address: item.address,
      area: item.area,
      lat: Number(item.lat),
      lng: Number(item.lng),
      category: item.category,
    });

    await db
      .update(places)
      .set({
        address: enriched.address,
        googleMapsUrl: enriched.googleMapsUrl,
        googlePlaceId: enriched.googlePlaceId ?? item.googlePlaceId,
        updatedAt: new Date(),
      })
      .where(eq(places.id, item.id));

    results.push({
      placeId: item.id,
      name: item.name,
      address: enriched.address,
      googleMapsUrl: enriched.googleMapsUrl,
      source: enriched.source,
    });

    // Tránh rate-limit khi gọi geocoding liên tục
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  return {
    totalProcessed: results.length,
    results,
  };
}
