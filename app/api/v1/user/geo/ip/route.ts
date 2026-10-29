import { NextRequest } from "next/server";
import { handleRoute, jsonData } from "@/server/http/route";
import { consumeRateLimit, getClientIp, RATE_LIMITS } from "@/server/http/rate-limit";
import { lookupIpLocation } from "@/server/services/geo/ip-geolocation.service";

export const dynamic = "force-dynamic";

/** Vị trí ước tính của người dùng theo IP (mức quận), để tính khoảng cách tới quán. Không lưu lại. */
export const GET = handleRoute(async (req: NextRequest) => {
  const ip = getClientIp(req);
  consumeRateLimit(RATE_LIMITS.GEO_LOOKUP, ip);
  const location = await lookupIpLocation(ip);
  return jsonData({ location }, { headers: { "Cache-Control": "private, no-store" } });
});
