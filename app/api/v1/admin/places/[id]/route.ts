import { NextRequest } from "next/server";
import { handleRoute, jsonData, parseJsonBody } from "@/server/http/route";
import { requireAdmin } from "@/server/auth/admin-auth";
import { updatePlaceBodySchema } from "@/lib/validators/admin";
import { getPlaceForAdmin, hidePlace, updatePlace } from "@/server/services/admin/place-admin.service";

type AdminPlaceRouteContext = { params: Promise<{ id: string }> };

export const GET = handleRoute(async (_req: NextRequest, { params }: AdminPlaceRouteContext) => {
  await requireAdmin();
  const { id } = await params;
  return jsonData(await getPlaceForAdmin(id));
});

export const PATCH = handleRoute(async (req: NextRequest, { params }: AdminPlaceRouteContext) => {
  const admin = await requireAdmin();
  const { id } = await params;
  const body = await parseJsonBody(req, updatePlaceBodySchema);
  return jsonData(await updatePlace(admin, id, body));
});

/** Xóa mềm: chuyển sang `hidden`, gỡ khỏi catalog công khai. */
export const DELETE = handleRoute(async (_req: NextRequest, { params }: AdminPlaceRouteContext) => {
  const admin = await requireAdmin();
  const { id } = await params;
  return jsonData(await hidePlace(admin, id));
});
