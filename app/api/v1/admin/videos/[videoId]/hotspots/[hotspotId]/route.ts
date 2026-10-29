import { NextRequest } from "next/server";
import { handleRoute, jsonData, parseJsonBody } from "@/server/http/route";
import { requireAdmin } from "@/server/auth/admin-auth";
import { reviewHotspotBodySchema } from "@/lib/validators/admin";
import { deleteAdminHotspot, reviewHotspot } from "@/server/services/admin/video-hotspot-admin.service";

type HotspotRouteContext = { params: Promise<{ videoId: string; hotspotId: string }> };

/** Duyệt / loại / chỉnh mốc hotspot. */
export const PATCH = handleRoute(async (req: NextRequest, { params }: HotspotRouteContext) => {
  const admin = await requireAdmin();
  const { videoId, hotspotId } = await params;
  const body = await parseJsonBody(req, reviewHotspotBodySchema);
  return jsonData(await reviewHotspot(admin, videoId, hotspotId, body));
});

export const DELETE = handleRoute(async (_req: NextRequest, { params }: HotspotRouteContext) => {
  const admin = await requireAdmin();
  const { videoId, hotspotId } = await params;
  return jsonData(await deleteAdminHotspot(admin, videoId, hotspotId));
});
