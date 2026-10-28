import { clearSessionCookie, requireRoomSession } from "@/server/auth/user-session";
import { handleRoute, jsonData } from "@/server/http/route";
import { leaveRoom } from "@/server/services/user/room.service";

export const POST = handleRoute(async () => {
  await leaveRoom(await requireRoomSession());
  return clearSessionCookie(jsonData({ success: true }));
});
