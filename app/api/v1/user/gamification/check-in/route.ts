import { NextRequest } from "next/server";
import { requireRoomSession } from "@/server/auth/user-session";
import { handleRoute, jsonData } from "@/server/http/route";
import {
  checkInPlace,
  type CheckInInput,
} from "@/server/services/user/gamification.service";
import { AppError, ERRORS } from "@/server/http/errors";

/**
 * Check-in tại quán (bằng GPS <300m hoặc nút xác nhận thủ công).
 * Tự động mở chặng tiếp của Vé Mù, mở Thư Tình và cào Bản Đồ 7 quận.
 */
export const POST = handleRoute(async (req: NextRequest) => {
  const session = await requireRoomSession();
  const body = (await req.json().catch(() => null)) as CheckInInput | null;

  if (!body || !body.placeName || !body.district) {
    throw new AppError(ERRORS.COMMON.VALIDATION_FAILED);
  }

  const result = await checkInPlace(session, {
    placeId: body.placeId,
    placeName: body.placeName,
    district: body.district,
    method: body.method === "gps_auto" ? "gps_auto" : "manual_confirm",
  });

  return jsonData(result);
});
