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
    hint?: string;
    content?: string;
  } | null;

  if (!body || typeof body.placeId !== "string" || !body.placeId.trim() || !body.content?.trim()) {
    throw new AppError(ERRORS.COMMON.VALIDATION_FAILED);
  }

  const note = await createSecretNote(session, {
    placeId: body.placeId.trim(),
    hint: body.hint,
    content: body.content,
  });

  return jsonData(note, { status: 201 });
});
