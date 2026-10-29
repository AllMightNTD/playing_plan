import { NextRequest } from "next/server";
import { handleRoute, jsonData } from "@/server/http/route";
import { requireRoomSession } from "@/server/auth/user-session";
import { undoSwipe } from "@/server/services/user/match.service";

/** Hoàn tác lượt quẹt gần nhất của thiết bị này với một địa điểm. */
export const DELETE = handleRoute(async (_req: NextRequest, { params }: { params: Promise<{ placeId: string }> }) => {
  const { placeId } = await params;
  return jsonData(await undoSwipe(await requireRoomSession(), placeId));
});
