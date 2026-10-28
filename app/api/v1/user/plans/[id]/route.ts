import { NextRequest } from "next/server";
import { handleRoute, jsonData, parseJsonBody } from "@/server/http/route";
import { requireRoomSession } from "@/server/auth/user-session";
import { updatePlanBodySchema } from "@/lib/validators/user";
import { deletePlan, getPlanDetail, updatePlan } from "@/server/services/user/plan.service";

type PlanRouteContext = { params: Promise<{ id: string }> };

export const GET = handleRoute(async (_req: NextRequest, { params }: PlanRouteContext) => {
  const { id } = await params;
  return jsonData(await getPlanDetail(await requireRoomSession(), id));
});

export const PATCH = handleRoute(async (req: NextRequest, { params }: PlanRouteContext) => {
  const { id } = await params;
  const session = await requireRoomSession();
  const body = await parseJsonBody(req, updatePlanBodySchema);
  return jsonData(await updatePlan(session, id, body));
});

export const DELETE = handleRoute(async (_req: NextRequest, { params }: PlanRouteContext) => {
  const { id } = await params;
  await deletePlan(await requireRoomSession(), id);
  return jsonData({ success: true });
});
