import { NextRequest } from "next/server";
import { getClientIp } from "@/server/http/rate-limit";
import { handleRoute, jsonData, parseJsonBody } from "@/server/http/route";
import { applyIssuedCredentials, findRoomSession } from "@/server/auth/user-session";
import { joinRoomBodySchema } from "@/lib/validators/user";
import { getRoomProfile, joinRoom } from "@/server/services/user/room.service";

export const POST = handleRoute(async (req: NextRequest) => {
  const body = await parseJsonBody(req, joinRoomBodySchema);
  const { session, issued } = await joinRoom(await findRoomSession(), body, getClientIp(req));
  return applyIssuedCredentials(jsonData(await getRoomProfile(session)), issued);
});
