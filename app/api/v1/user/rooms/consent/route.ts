import { NextRequest } from "next/server";
import { requireRoomSession } from "@/server/auth/user-session";
import { handleRoute, jsonData, parseJsonBody } from "@/server/http/route";
import { recordRoomConsent } from "@/server/services/user/room.service";
import { z } from "zod";

const consentBodySchema = z.object({
  consentVersion: z.string().max(20).optional().default("2026.1"),
});

export const POST = handleRoute(async (req: NextRequest) => {
  const session = await requireRoomSession();
  const body = await parseJsonBody(req, consentBodySchema).catch(() => ({ consentVersion: "2026.1" }));
  await recordRoomConsent(session, body.consentVersion);
  return jsonData({ success: true, consentVersion: body.consentVersion });
});
