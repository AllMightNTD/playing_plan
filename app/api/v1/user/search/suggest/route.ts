import { NextRequest } from "next/server";
import { consumeRateLimit, getClientIp, RATE_LIMITS } from "@/server/http/rate-limit";
import { handleRoute, jsonData, parseSearchParams } from "@/server/http/route";
import { suggestQuerySchema } from "@/lib/validators/user";
import { getPlaceSuggestions } from "@/server/services/user/places.service";

const SUGGEST_CACHE_HEADERS = { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" };

export const GET = handleRoute(async (req: NextRequest) => {
  consumeRateLimit(RATE_LIMITS.SEARCH, getClientIp(req));
  const query = parseSearchParams(req, suggestQuerySchema);
  const suggestions = await getPlaceSuggestions(query.q, query.limit);
  return jsonData({ suggestions }, { headers: SUGGEST_CACHE_HEADERS });
});
