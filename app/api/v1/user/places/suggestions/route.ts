import { NextRequest } from "next/server";
import { handleRoute, jsonData, parseSearchParams, PUBLIC_CACHE_HEADERS } from "@/server/http/route";
import { placeSuggestionsQuerySchema } from "@/lib/validators/user";
import { getPlaceSuggestions } from "@/server/services/user/places.service";

export const GET = handleRoute(async (req: NextRequest) => {
  const query = parseSearchParams(req, placeSuggestionsQuerySchema);
  const items = await getPlaceSuggestions(query.q, query.limit);

  return jsonData(items, {
    headers: PUBLIC_CACHE_HEADERS,
  });
});
