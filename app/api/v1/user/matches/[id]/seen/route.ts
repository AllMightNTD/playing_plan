import { NextRequest } from "next/server";
import { requireRoomSession } from "@/server/auth/user-session";
import { handleRoute, jsonData } from "@/server/http/route";
import { markMatchAsSeen } from "@/server/services/user/match.service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const POST = handleRoute(async (_req: NextRequest, context: RouteContext) => {
  const session = await requireRoomSession();
  const { id } = await context.params;

  const success = await markMatchAsSeen(session, id);
  return jsonData({ success });
});
