import { NextRequest } from "next/server";
import { requireRoomSession } from "@/server/auth/user-session";
import { handleRoute, jsonData } from "@/server/http/route";
import { applyPlanBIndoor } from "@/server/services/user/plan-schedule.service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const POST = handleRoute(async (_req: NextRequest, context: RouteContext) => {
  const session = await requireRoomSession();
  const { id } = await context.params;

  const planB = await applyPlanBIndoor(session, id);
  return jsonData(planB);
});
