import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRoomSession } from "@/server/auth/user-session";
import { handleRoute, jsonData } from "@/server/http/route";
import { shiftPlanSchedule } from "@/server/services/user/plan-schedule.service";

const rippleShiftSchema = z.object({
  stopId: z.string().min(1),
  shiftMinutes: z.number().int().min(-720).max(720),
  expectedVersion: z.number().int().min(1),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const POST = handleRoute(async (req: NextRequest, context: RouteContext) => {
  const session = await requireRoomSession();
  const { id } = await context.params;
  const json = await req.json();
  const body = rippleShiftSchema.parse(json);

  const updatedPlan = await shiftPlanSchedule(session, id, body);
  return jsonData(updatedPlan);
});
