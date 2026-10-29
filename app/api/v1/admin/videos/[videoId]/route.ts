import { NextRequest } from "next/server";
import { handleRoute, jsonData } from "@/server/http/route";
import { requireAdmin } from "@/server/auth/admin-auth";
import { getAdminVideoDetail } from "@/server/services/admin/video-hotspot-admin.service";

export const GET = handleRoute(async (_req: NextRequest, { params }: { params: Promise<{ videoId: string }> }) => {
  await requireAdmin();
  const { videoId } = await params;
  return jsonData(await getAdminVideoDetail(videoId));
});
