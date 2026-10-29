import { NextRequest } from "next/server";
import { requireRoomSession } from "@/server/auth/user-session";
import { handleRoute, jsonData } from "@/server/http/route";
import { revokePlanShareToken } from "@/server/services/user/plan-rsvp.service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const POST = handleRoute(async (_req: NextRequest, context: RouteContext) => {
  const session = await requireRoomSession();
  const { id } = await context.params;

  await revokePlanShareToken(session, id);
  return jsonData({ revoked: true });
});
