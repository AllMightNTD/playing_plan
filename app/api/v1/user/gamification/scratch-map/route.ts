import { requireRoomSession } from "@/server/auth/user-session";
import { handleRoute, jsonData } from "@/server/http/route";
import { getScratchMap } from "@/server/services/user/gamification.service";

/**
 * Lấy dữ liệu Bản đồ cào 7 khu vực Hà Nội tính toán trực tiếp từ place_checkins.
 */
export const GET = handleRoute(async () => {
  const session = await requireRoomSession();
  const scratchMap = await getScratchMap(session);
  return jsonData(scratchMap);
});
