import { NextRequest } from "next/server";
import { getClientIp } from "@/server/http/rate-limit";
import { handleRoute, jsonData } from "@/server/http/route";
import { applyIssuedCredentials, findRoomSession } from "@/server/auth/user-session";
import { createInvite, ensureRoomSession } from "@/server/services/user/room.service";

export const POST = handleRoute(async (req: NextRequest) => {
  const { session, issued } = await ensureRoomSession(await findRoomSession(), getClientIp(req));
  const invite = await createInvite(session);
  return applyIssuedCredentials(jsonData(invite, { status: 201 }), issued);
});
