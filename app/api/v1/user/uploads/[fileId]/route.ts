import { NextRequest, NextResponse } from "next/server";
import { requireRoomSession } from "@/server/auth/user-session";
import { handleRoute, jsonData } from "@/server/http/route";
import { deleteRoomUpload, getProtectedUpload } from "@/server/services/user/upload.service";

interface RouteContext {
  params: Promise<{ fileId: string }>;
}

export const GET = handleRoute(async (_req: NextRequest, context: RouteContext) => {
  const session = await requireRoomSession();
  const { fileId } = await context.params;

  const fileData = await getProtectedUpload(session, fileId);

  return new NextResponse(new Uint8Array(fileData.buffer), {
    status: 200,
    headers: {
      "Content-Type": fileData.mimeType,
      "Content-Length": fileData.sizeBytes.toString(),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=86400",
      "Access-Control-Allow-Origin": "*",
    },
  });
});

export const DELETE = handleRoute(async (_req: NextRequest, context: RouteContext) => {
  const session = await requireRoomSession();
  const { fileId } = await context.params;

  await deleteRoomUpload(session, fileId);
  return jsonData({ success: true });
});
