import { NextRequest } from "next/server";
import { handleRoute, jsonData, parseJsonBody } from "@/server/http/route";
import { requireRoomSession } from "@/server/auth/user-session";
import { quickAddPlanBodySchema } from "@/lib/validators/user";
import { quickAddStopToPlan } from "@/server/services/user/home.service";

export const POST = handleRoute(async (req: NextRequest) => {
  const session = await requireRoomSession();
  const body = await parseJsonBody(req, quickAddPlanBodySchema);
  const result = await quickAddStopToPlan(session, body.placeId);

  return jsonData(result);
});
