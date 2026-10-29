import { NextRequest } from "next/server";
import { clearSessionCookie, requireRoomSession } from "@/server/auth/user-session";
import { handleRoute, jsonData } from "@/server/http/route";
import { deleteRoom, getRoomProfile, requestSoftDelete } from "@/server/services/user/room.service";

/** Lấy thông tin phòng hiện tại, thành viên và quota */
export const GET = handleRoute(async () => {
  const session = await requireRoomSession();
  return jsonData(await getRoomProfile(session));
});

/**
 * Yêu cầu Soft-Delete 14 ngày (mặc định) hoặc Hard-Delete vĩnh viễn (nếu ?hard=true).
 */
export const DELETE = handleRoute(async (req: NextRequest) => {
  const session = await requireRoomSession();
  const url = new URL(req.url);
  const isHard = url.searchParams.get("hard") === "true";

  if (isHard) {
    await deleteRoom(session);
    return clearSessionCookie(jsonData({ success: true, mode: "hard_delete" }));
  }

  const pendingDeletedAt = await requestSoftDelete(session);
  return jsonData({ success: true, mode: "soft_delete", pendingDeletedAt });
});
