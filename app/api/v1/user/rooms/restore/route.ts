import { requireRoomSession } from "@/server/auth/user-session";
import { handleRoute, jsonData } from "@/server/http/route";
import { restoreSoftDelete } from "@/server/services/user/room.service";

/** Hủy yêu cầu giải tán phòng trong thời hạn 14 ngày soft-delete */
export const POST = handleRoute(async () => {
  const session = await requireRoomSession();
  await restoreSoftDelete(session);
  return jsonData({ success: true, restored: true });
});
