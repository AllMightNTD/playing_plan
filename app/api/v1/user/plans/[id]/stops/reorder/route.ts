import { NextRequest } from "next/server";
import { handleRoute, jsonData, parseJsonBody } from "@/server/http/route";
import { requireRoomSession } from "@/server/auth/user-session";
import { reorderStopsBodySchema } from "@/lib/validators/user";
import { reorderStops } from "@/server/services/user/plan-items.service";

export const PATCH = handleRoute(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const session = await requireRoomSession();
  const body = await parseJsonBody(req, reorderStopsBodySchema);
  await reorderStops(session, id, body.stopIds);
  return jsonData({ success: true });
});
