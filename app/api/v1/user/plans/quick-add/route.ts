import { NextRequest } from "next/server";
import { getClientIp } from "@/server/http/rate-limit";
import { handleRoute, jsonData, parseJsonBody } from "@/server/http/route";
import { applyIssuedCredentials, findRoomSession } from "@/server/auth/user-session";
import { quickAddPlanBodySchema } from "@/lib/validators/user";
import { ensureRoomSession } from "@/server/services/user/room.service";
import { quickAddStopToPlan } from "@/server/services/user/home.service";

export const POST = handleRoute(async (req: NextRequest) => {
  const body = await parseJsonBody(req, quickAddPlanBodySchema);
  // Lần ghi đầu tiên (chưa có phiên) tự tạo phòng solo, giống luồng lưu địa điểm.
  const { session, issued } = await ensureRoomSession(await findRoomSession(), getClientIp(req));
  const result = await quickAddStopToPlan(session, body.placeId);

  return applyIssuedCredentials(jsonData(result), issued);
});
