import { requireRoomSession, RECOVERY_KEY_HEADER } from "@/server/auth/user-session";
import { handleRoute, jsonData } from "@/server/http/route";
import { rotateRecoveryKey } from "@/server/services/user/room.service";

/** Cấp khóa khôi phục mới cho thiết bị hiện tại; khóa/link sao lưu cũ hết hiệu lực. */
export const POST = handleRoute(async () => {
  const recoveryKey = await rotateRecoveryKey(await requireRoomSession());
  const res = jsonData({ recoveryKey, syncPath: `/r/sync?k=${recoveryKey}` }, { status: 201 });
  res.headers.set(RECOVERY_KEY_HEADER, recoveryKey);
  return res;
});
