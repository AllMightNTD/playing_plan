import { NextRequest } from "next/server";
import { requireRoomSession } from "@/server/auth/user-session";
import { handleRoute, jsonData } from "@/server/http/route";
import { revokeRoomMember } from "@/server/services/user/room.service";

export const DELETE = handleRoute(
  async (_req: NextRequest, { params }: { params: Promise<{ memberId: string }> }) => {
    const { memberId } = await params;
    await revokeRoomMember(await requireRoomSession(), memberId);
    return jsonData({ success: true });
  }
);
