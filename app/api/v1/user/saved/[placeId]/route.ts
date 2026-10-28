import { NextRequest } from "next/server";
import { getClientIp } from "@/server/http/rate-limit";
import { handleRoute, jsonData } from "@/server/http/route";
import { applyIssuedCredentials, findRoomSession, requireRoomSession } from "@/server/auth/user-session";
import { ensureRoomSession } from "@/server/services/user/room.service";
import { savePlace, unsavePlace } from "@/server/services/user/saved.service";

type SavedRouteContext = { params: Promise<{ placeId: string }> };

export const POST = handleRoute(async (req: NextRequest, { params }: SavedRouteContext) => {
  const { placeId } = await params;
  const { session, issued } = await ensureRoomSession(await findRoomSession(), getClientIp(req));
  await savePlace(session, placeId);
  return applyIssuedCredentials(jsonData({ success: true }), issued);
});

export const DELETE = handleRoute(async (_req: NextRequest, { params }: SavedRouteContext) => {
  const { placeId } = await params;
  await unsavePlace(await requireRoomSession(), placeId);
  return jsonData({ success: true });
});
