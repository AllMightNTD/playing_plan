import { clearSessionCookie, requireRoomSession } from "@/server/auth/user-session";
import { handleRoute, jsonData } from "@/server/http/route";
import { deleteRoom } from "@/server/services/user/room.service";

/** Xóa cứng toàn bộ phòng: kế hoạch, Match, kỷ niệm, thiết bị (F01). */
export const DELETE = handleRoute(async () => {
  await deleteRoom(await requireRoomSession());
  return clearSessionCookie(jsonData({ success: true }));
});
