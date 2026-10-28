import { NextRequest } from "next/server";
import { handleRoute, jsonData, PUBLIC_CACHE_HEADERS } from "@/server/http/route";
import { findPlaceBySlug } from "@/server/services/user/places.service";
import { AppError, ERRORS } from "@/server/http/errors";

export const GET = handleRoute(async (req: NextRequest, { params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  const place = await findPlaceBySlug(slug);

  if (!place) {
    throw new AppError(ERRORS.PLACE.NOT_FOUND);
  }

  return jsonData(place, {
    headers: PUBLIC_CACHE_HEADERS,
  });
});
