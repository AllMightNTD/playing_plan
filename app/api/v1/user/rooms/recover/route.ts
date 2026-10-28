import { NextRequest } from "next/server";
import { getClientIp } from "@/server/http/rate-limit";
import { handleRoute, jsonData, parseJsonBody } from "@/server/http/route";
import { applyIssuedCredentials } from "@/server/auth/user-session";
import { recoverRoomBodySchema } from "@/lib/validators/user";
import { getRoomProfile, recoverSession } from "@/server/services/user/room.service";

/** Silent Recovery từ localStorage hoặc link sao lưu `/r/sync?k=...`. */
export const POST = handleRoute(async (req: NextRequest) => {
  const body = await parseJsonBody(req, recoverRoomBodySchema);
  const { session, issued } = await recoverSession(body.key, getClientIp(req));
  return applyIssuedCredentials(jsonData(await getRoomProfile(session)), issued);
});
