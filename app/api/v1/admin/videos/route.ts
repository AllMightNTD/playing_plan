import { NextRequest } from "next/server";
import { handleRoute, jsonData, parseSearchParams } from "@/server/http/route";
import { requireAdmin } from "@/server/auth/admin-auth";
import { adminVideoListQuerySchema } from "@/lib/validators/admin";
import { listAdminVideos } from "@/server/services/admin/video-hotspot-admin.service";

export const GET = handleRoute(async (req: NextRequest) => {
  await requireAdmin();
  return jsonData(await listAdminVideos(parseSearchParams(req, adminVideoListQuerySchema)));
});
