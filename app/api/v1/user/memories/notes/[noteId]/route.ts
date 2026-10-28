import { NextRequest } from "next/server";
import { handleRoute, jsonData } from "@/server/http/route";
import { requireRoomSession } from "@/server/auth/user-session";
import { deleteMemoryNote } from "@/server/services/user/memory.service";

type MemoryNoteRouteContext = { params: Promise<{ noteId: string }> };

export const DELETE = handleRoute(async (_req: NextRequest, { params }: MemoryNoteRouteContext) => {
  const { noteId } = await params;
  await deleteMemoryNote(await requireRoomSession(), noteId);
  return jsonData({ success: true });
});
