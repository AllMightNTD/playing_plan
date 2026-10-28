import { NextRequest } from "next/server";
import { getClientIp } from "@/server/http/rate-limit";
import { handleRoute, jsonData, parseJsonBody } from "@/server/http/route";
import { applyIssuedCredentials, findRoomSession } from "@/server/auth/user-session";
import { createMemoryNoteBodySchema } from "@/lib/validators/user";
import { ensureRoomSession } from "@/server/services/user/room.service";
import { createMemoryNote } from "@/server/services/user/memory.service";

export const POST = handleRoute(async (req: NextRequest) => {
  const body = await parseJsonBody(req, createMemoryNoteBodySchema);
  const { session, issued } = await ensureRoomSession(await findRoomSession(), getClientIp(req));
  const note = await createMemoryNote(session, body);
  return applyIssuedCredentials(jsonData(note, { status: 201 }), issued);
});
