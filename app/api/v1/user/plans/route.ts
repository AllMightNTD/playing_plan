import { NextRequest } from "next/server";
import { getClientIp } from "@/server/http/rate-limit";
import { handleRoute, jsonData, parseJsonBody } from "@/server/http/route";
import { applyIssuedCredentials, findRoomSession } from "@/server/auth/user-session";
import { createPlanBodySchema } from "@/lib/validators/user";
import { ensureRoomSession } from "@/server/services/user/room.service";
import { createPlan, listPlans } from "@/server/services/user/plan.service";

export const GET = handleRoute(async () => {
  return jsonData(await listPlans(await findRoomSession()));
});

/** Tạo kế hoạch đầu tiên sẽ tạo phòng ngầm (F01). */
export const POST = handleRoute(async (req: NextRequest) => {
  const body = await parseJsonBody(req, createPlanBodySchema);
  const { session, issued } = await ensureRoomSession(await findRoomSession(), getClientIp(req));
  const plan = await createPlan(session, body);
  return applyIssuedCredentials(jsonData(plan, { status: 201 }), issued);
});
