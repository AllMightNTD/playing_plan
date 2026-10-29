import { NextRequest } from "next/server";
import { handleRoute, jsonData, parseJsonBody } from "@/server/http/route";
import { requireAdmin } from "@/server/auth/admin-auth";
import { createHotspotBodySchema } from "@/lib/validators/admin";
import { createAdminHotspot } from "@/server/services/admin/video-hotspot-admin.service";

/** Admin ghim địa điểm tại một giây trong video (duyệt ngay). */
export const POST = handleRoute(async (req: NextRequest, { params }: { params: Promise<{ videoId: string }> }) => {
  const admin = await requireAdmin();
  const { videoId } = await params;
  const body = await parseJsonBody(req, createHotspotBodySchema);
  return jsonData(await createAdminHotspot(admin, videoId, body), { status: 201 });
});
