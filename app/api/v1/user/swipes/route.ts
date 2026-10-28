import { NextRequest } from "next/server";
import { getClientIp } from "@/server/http/rate-limit";
import { handleRoute, jsonData, parseJsonBody } from "@/server/http/route";
import { applyIssuedCredentials, findRoomSession } from "@/server/auth/user-session";
import { swipeBodySchema } from "@/lib/validators/user";
import { ensureRoomSession } from "@/server/services/user/room.service";
import { recordSwipe } from "@/server/services/user/match.service";

/** Vuốt lần đầu sẽ tạo phòng ngầm (F01). */
export const POST = handleRoute(async (req: NextRequest) => {
  const body = await parseJsonBody(req, swipeBodySchema);
  const { session, issued } = await ensureRoomSession(await findRoomSession(), getClientIp(req));
  const result = await recordSwipe(session, body.placeId, body.choice);
  return applyIssuedCredentials(jsonData(result), issued);
});
