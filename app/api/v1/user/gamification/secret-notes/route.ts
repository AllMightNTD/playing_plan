import { NextRequest } from "next/server";
import { requireRoomSession } from "@/server/auth/user-session";
import { handleRoute, jsonData } from "@/server/http/route";
import {
  createSecretNote,
  listSecretNotes,
} from "@/server/services/user/gamification.service";
import { AppError, ERRORS } from "@/server/http/errors";

/**
 * Lấy danh sách thư tình bí mật của phòng (che nội dung với thư chưa mở).
 */
export const GET = handleRoute(async () => {
  const session = await requireRoomSession();
  const notes = await listSecretNotes(session);
  return jsonData(notes);
});

/**
 * Tạo thư tình bí mật cất giấu tại tọa độ hẹn.
 */
export const POST = handleRoute(async (req: NextRequest) => {
  const session = await requireRoomSession();
  const body = (await req.json().catch(() => null)) as {
    placeId?: string;
    placeName?: string;
    district?: string;
    hint?: string;
    content?: string;
  } | null;

  if (!body || !body.placeName || !body.content || body.content.trim().length === 0) {
    throw new AppError(ERRORS.COMMON.VALIDATION_FAILED);
  }

  const note = await createSecretNote(session, {
    placeId: body.placeId,
    placeName: body.placeName,
    district: body.district,
    hint: body.hint,
    content: body.content,
  });

  return jsonData(note, { status: 201 });
});
