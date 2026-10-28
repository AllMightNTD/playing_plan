import { NextRequest } from "next/server";
import { handleRoute, jsonData, parseSearchParams, PUBLIC_CACHE_HEADERS } from "@/server/http/route";
import { placeListQuerySchema } from "@/lib/validators/user";
import { queryPlaces } from "@/server/services/user/places.service";

export const GET = handleRoute(async (req: NextRequest) => {
  const query = parseSearchParams(req, placeListQuerySchema);
  const page = await queryPlaces(
    {
      mood: query.mood,
      category: query.category,
      price: query.price,
      area: query.area,
      indoor: query.indoor,
      q: query.q,
    },
    query.cursor,
    query.limit
  );

  return jsonData(page, {
    headers: PUBLIC_CACHE_HEADERS,
  });
});
