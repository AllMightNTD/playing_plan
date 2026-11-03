import { NextRequest } from "next/server";
import { handleRoute, jsonData, PUBLIC_CACHE_HEADERS } from "@/server/http/route";
import { findPlaceBySlug } from "@/server/services/user/places.service";
import { AppError, ERRORS } from "@/server/http/errors";
import {
  buildGoogleMapsSearchUrl,
  buildGoogleMapsDirectionsUrl,
  buildGoogleMapsEmbedUrl,
} from "@/server/services/maps/google-maps.builder";

export const GET = handleRoute(async (_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  const place = await findPlaceBySlug(slug);

  if (!place) {
    throw new AppError(ERRORS.PLACE.NOT_FOUND);
  }

  const mapParams = {
    name: place.name,
    address: place.address,
    area: place.area,
    lat: place.lat,
    lng: place.lng,
    placeId: place.googlePlaceId,
    googleMapsUrl: place.googleMapsUrl,
  };

  return jsonData(
    {
      id: place.id,
      slug: place.slug,
      name: place.name,
      address: place.address,
      area: place.area,
      lat: place.lat,
      lng: place.lng,
      googlePlaceId: place.googlePlaceId ?? null,
      googleMapsUrl: place.googleMapsUrl || buildGoogleMapsSearchUrl(mapParams),
      directionsUrl: place.directionsUrl || buildGoogleMapsDirectionsUrl(mapParams),
      embedUrl: buildGoogleMapsEmbedUrl(mapParams),
    },
    {
      headers: PUBLIC_CACHE_HEADERS,
    }
  );
});
