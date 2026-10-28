import { NextRequest } from "next/server";
import { handleRoute, jsonData, PUBLIC_CACHE_HEADERS } from "@/server/http/route";
import { getHomePublic } from "@/server/services/user/home.service";

export const GET = handleRoute(async (req: NextRequest) => {
  const city = req.nextUrl.searchParams.get("city") || "hanoi";
  const data = await getHomePublic(city);

  return jsonData(data, {
    headers: PUBLIC_CACHE_HEADERS,
  });
});
