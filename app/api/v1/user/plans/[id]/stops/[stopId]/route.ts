import { NextRequest } from "next/server";
import { handleRoute, jsonData, parseJsonBody } from "@/server/http/route";
import { requireRoomSession } from "@/server/auth/user-session";
import { updateStopBodySchema } from "@/lib/validators/user";
import { deleteStop, updateStop } from "@/server/services/user/plan-items.service";

type StopRouteContext = { params: Promise<{ id: string; stopId: string }> };

export const PATCH = handleRoute(async (req: NextRequest, { params }: StopRouteContext) => {
  const { id, stopId } = await params;
  const session = await requireRoomSession();
  const body = await parseJsonBody(req, updateStopBodySchema);
  await updateStop(session, id, stopId, body);
  return jsonData({ success: true });
});

export const DELETE = handleRoute(async (_req: NextRequest, { params }: StopRouteContext) => {
  const { id, stopId } = await params;
  await deleteStop(await requireRoomSession(), id, stopId);
  return jsonData({ success: true });
});
