import { NextRequest } from "next/server";
import { requireRoomSession } from "@/server/auth/user-session";
import { handleRoute, jsonData } from "@/server/http/route";
import { listRoomUploads, uploadRoomPhoto } from "@/server/services/user/upload.service";
import { AppError, ERRORS } from "@/server/http/errors";

export const GET = handleRoute(async () => {
  const session = await requireRoomSession();
  const list = await listRoomUploads(session);
  return jsonData(list);
});


export const POST = handleRoute(async (req: NextRequest) => {
  const session = await requireRoomSession();
  const formData = await req.formData().catch(() => null);

  if (!formData) {
    throw new AppError(ERRORS.COMMON.VALIDATION_FAILED);
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    throw new AppError(ERRORS.UPLOAD.INVALID_IMAGE);
  }

  const memoryId = formData.get("memoryId");
  const memoryIdStr = typeof memoryId === "string" && memoryId.trim() ? memoryId.trim() : null;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const result = await uploadRoomPhoto(session, {
    fileName: file.name || "photo.jpg",
    buffer,
    memoryId: memoryIdStr,
  });

  return jsonData(result, { status: 201 });
});
