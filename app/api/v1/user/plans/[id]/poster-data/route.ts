import { NextRequest } from "next/server";
import { requireRoomSession } from "@/server/auth/user-session";
import { handleRoute, jsonData } from "@/server/http/route";
import { getPlanPosterData } from "@/server/services/user/plan-rsvp.service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const GET = handleRoute(async (req: NextRequest, context: RouteContext) => {
  const session = await requireRoomSession();
  const { id } = await context.params;
  const privacy = req.nextUrl.searchParams.get("privacy") === "true";

  const posterData = await getPlanPosterData(session, id, privacy);
  return jsonData(posterData);
});
