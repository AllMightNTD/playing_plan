import { NextRequest } from "next/server";
import { z } from "zod";
import { handleRoute, jsonData } from "@/server/http/route";
import { getClientIp } from "@/server/http/rate-limit";
import { submitGuestRsvp } from "@/server/services/user/plan-rsvp.service";

const guestRsvpSchema = z.object({
  responderName: z.string().min(1).max(60),
  status: z.enum(["confirmed", "change_requested"]),
  changeNote: z.string().max(500).optional(),
});

interface RouteContext {
  params: Promise<{ inviteToken: string }>;
}

export const POST = handleRoute(async (req: NextRequest, context: RouteContext) => {
  const { inviteToken } = await context.params;
  const clientIp = getClientIp(req);
  const json = await req.json();
  const body = guestRsvpSchema.parse(json);

  const result = await submitGuestRsvp(clientIp, inviteToken, body);
  return jsonData(result);
});
