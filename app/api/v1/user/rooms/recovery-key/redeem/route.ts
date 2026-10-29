import { NextRequest } from "next/server";
import { getClientIp } from "@/server/http/rate-limit";
import { handleRoute, jsonData, parseJsonBody } from "@/server/http/route";
import { applyIssuedCredentials, RECOVERY_KEY_HEADER } from "@/server/auth/user-session";
import { recoverRoomBodySchema } from "@/lib/validators/user";
import { getRoomProfile, recoverSession } from "@/server/services/user/room.service";

/**
 * Phục hồi phiên phòng bằng mã khôi phục bí mật (kèm xoay key mới và rate limit).
 * POST /api/v1/user/rooms/recovery-key/redeem
 */
export const POST = handleRoute(async (req: NextRequest) => {
  const body = await parseJsonBody(req, recoverRoomBodySchema);
  const { session, issued } = await recoverSession(body.key, getClientIp(req));
  const res = applyIssuedCredentials(jsonData(await getRoomProfile(session)), issued);
  if (issued?.recoveryKey) {
    res.headers.set(RECOVERY_KEY_HEADER, issued.recoveryKey);
  }
  return res;
});
