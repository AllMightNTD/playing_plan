import { NextRequest } from "next/server";
import { getClientIp } from "@/server/http/rate-limit";
import { handleRoute, jsonData, parseOptionalJsonBody } from "@/server/http/route";
import { applyIssuedCredentials, findRoomSession } from "@/server/auth/user-session";
import { createSessionBodySchema } from "@/lib/validators/user";
import { ensureRoomSession } from "@/server/services/user/room.service";

export const POST = handleRoute(async (req: NextRequest) => {
  const body = await parseOptionalJsonBody(req, createSessionBodySchema);
  const { session, issued } = await ensureRoomSession(await findRoomSession(), getClientIp(req), body.nickname);

  const res = jsonData(
    { roomId: session.roomId, memberId: session.memberId, created: issued !== null },
    { status: issued ? 201 : 200 }
  );
  return applyIssuedCredentials(res, issued);
});
