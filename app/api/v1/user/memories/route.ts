import { handleRoute, jsonData, parseJsonBody } from "@/server/http/route";
import { findRoomSession, refreshSessionCookie, requireRoomSession } from "@/server/auth/user-session";
import { createPlanMemoryBodySchema } from "@/lib/validators/user";
import { completePlanWithMemory, getMemoryBoard } from "@/server/services/user/memory.service";

export const GET = handleRoute(async () => {
  return jsonData(await getMemoryBoard(await findRoomSession()));
});

export const POST = handleRoute(async (req) => {
  const session = await requireRoomSession();
  const body = await parseJsonBody(req, createPlanMemoryBodySchema);
  const created = await completePlanWithMemory(session, body);
  return refreshSessionCookie(jsonData(created, { status: 201 }));
});
