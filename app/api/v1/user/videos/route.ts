import { NextRequest } from "next/server";
import { handleRoute, jsonData, parseSearchParams, PUBLIC_CACHE_HEADERS } from "@/server/http/route";
import { videoCatalogQuerySchema } from "@/lib/validators/user";
import { queryUserVideos } from "@/server/services/user/videos.service";

export const dynamic = "force-dynamic";

export const GET = handleRoute(async (req: NextRequest) => {
  const query = parseSearchParams(req, videoCatalogQuerySchema);
  const result = await queryUserVideos({
    q: query.q,
    category: query.category,
    tab: query.tab,
    channel: query.channel,
    page: query.page,
    limit: query.limit,
  });

  return jsonData(result, {
    headers: PUBLIC_CACHE_HEADERS,
  });
});
