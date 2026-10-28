import { NextRequest } from "next/server";
import { handleRoute, jsonData, parseJsonBody } from "@/server/http/route";
import { requireRoomSession } from "@/server/auth/user-session";
import { updateChecklistItemBodySchema } from "@/lib/validators/user";
import { deleteChecklistItem, updateChecklistItem } from "@/server/services/user/plan-items.service";

type ChecklistRouteContext = { params: Promise<{ id: string; itemId: string }> };

export const PATCH = handleRoute(async (req: NextRequest, { params }: ChecklistRouteContext) => {
  const { id, itemId } = await params;
  const session = await requireRoomSession();
  const body = await parseJsonBody(req, updateChecklistItemBodySchema);
  await updateChecklistItem(session, id, itemId, body);
  return jsonData({ success: true });
});

export const DELETE = handleRoute(async (_req: NextRequest, { params }: ChecklistRouteContext) => {
  const { id, itemId } = await params;
  await deleteChecklistItem(await requireRoomSession(), id, itemId);
  return jsonData({ success: true });
});
