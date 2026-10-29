import { findRoomSession } from "@/server/auth/user-session";
import { handleRoute, jsonData } from "@/server/http/route";
import { checkRoomConflict } from "@/server/services/user/room.service";

/** Kiểm tra xung đột dữ liệu phòng solo khi click link mời phòng đôi */
export const GET = handleRoute(async () => {
  const session = await findRoomSession();
  if (!session) {
    return jsonData({ hasConflict: false, isSolo: false, hasData: false });
  }
  const conflict = await checkRoomConflict(session.roomId);
  return jsonData({
    hasConflict: conflict.isSolo && conflict.hasData,
    ...conflict,
  });
});
