import { NextRequest } from "next/server";
import { handleRoute, jsonData, parseJsonBody } from "@/server/http/route";
import { requireRoomSession } from "@/server/auth/user-session";
import { addStopBodySchema } from "@/lib/validators/user";
import { addStop } from "@/server/services/user/plan-items.service";

export const POST = handleRoute(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const session = await requireRoomSession();
  const body = await parseJsonBody(req, addStopBodySchema);
  return jsonData(await addStop(session, id, body), { status: 201 });
});
