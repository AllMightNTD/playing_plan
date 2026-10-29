import { requireRoomSession } from "@/server/auth/user-session";
import { handleRoute, jsonData } from "@/server/http/route";
import { listRoomNotices } from "@/server/services/user/room-notice.service";

export const GET = handleRoute(async () => {
  const session = await requireRoomSession();
  const notices = await listRoomNotices(session);
  return jsonData({ notices });
});
