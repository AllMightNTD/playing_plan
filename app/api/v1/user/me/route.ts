import { NextRequest } from "next/server";
import { handleRoute, jsonData, parseJsonBody } from "@/server/http/route";
import { findRoomSession, refreshSessionCookie, requireRoomSession } from "@/server/auth/user-session";
import { updateMeBodySchema } from "@/lib/validators/user";
import { getRoomProfile, updateRoomProfile } from "@/server/services/user/room.service";

/** Chưa có phiên thì trả `data: null` (F01: route đọc dữ liệu riêng trả rỗng). */
export const GET = handleRoute(async () => {
  const session = await findRoomSession();
  if (!session) return jsonData(null);
  return refreshSessionCookie(jsonData(await getRoomProfile(session)));
});

export const PATCH = handleRoute(async (req: NextRequest) => {
  const session = await requireRoomSession();
  const body = await parseJsonBody(req, updateMeBodySchema);
  return jsonData(await updateRoomProfile(session, body));
});
