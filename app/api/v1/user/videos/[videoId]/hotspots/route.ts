import { NextRequest } from "next/server";
import { handleRoute, jsonData } from "@/server/http/route";
import { getVideoHotspots } from "@/server/services/user/video-hotspots.service";

interface RouteContext {
  params: Promise<{ videoId: string }>;
}

export const GET = handleRoute(async (_req: NextRequest, context: RouteContext) => {
  const { videoId } = await context.params;
  const hotspotsDetail = await getVideoHotspots(videoId);
  return jsonData(hotspotsDetail);
});
