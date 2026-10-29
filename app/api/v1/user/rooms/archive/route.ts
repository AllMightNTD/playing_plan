import { NextResponse } from "next/server";
import { requireRoomSession } from "@/server/auth/user-session";
import { handleRoute } from "@/server/http/route";
import { createRoomArchiveStream } from "@/server/services/user/room-archive.service";
import { PassThrough } from "stream";

export const GET = handleRoute(async () => {
  const session = await requireRoomSession();
  const { archive, fileName } = await createRoomArchiveStream(session);

  const passThrough = new PassThrough();
  archive.pipe(passThrough);
  archive.finalize().catch((err: unknown) => {
    console.error("Archive finalize error:", err);
  });

  const webStream = new ReadableStream({
    start(controller) {
      passThrough.on("data", (chunk: Buffer) => controller.enqueue(chunk));
      passThrough.on("end", () => controller.close());
      passThrough.on("error", (err: unknown) => controller.error(err));
    },
    cancel() {
      passThrough.destroy();
    },
  });

  return new NextResponse(webStream, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
});
