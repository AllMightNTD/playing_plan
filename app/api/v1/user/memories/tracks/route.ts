import { requireRoomSession } from "@/server/auth/user-session";
import { handleRoute, jsonData } from "@/server/http/route";
import { getAudioTracks } from "@/lib/media/audio-tracks";

/**
 * Lấy danh sách nhạc Lo-Fi Royalty-Free nội bộ kèm beatmap offline.
 * Bắt buộc có phiên phòng theo chuẩn Section 4.2.
 */
export const GET = handleRoute(async () => {
  await requireRoomSession();
  return jsonData(getAudioTracks());
});
