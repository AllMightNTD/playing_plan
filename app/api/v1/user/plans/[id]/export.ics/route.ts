import { NextRequest } from "next/server";
import { handleRoute, NO_STORE_HEADERS } from "@/server/http/route";
import { requireRoomSession } from "@/server/auth/user-session";
import { exportPlanCalendar } from "@/server/services/user/plan.service";

export const GET = handleRoute(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const icsContent = await exportPlanCalendar(await requireRoomSession(), id);

  return new Response(icsContent, {
    headers: {
      ...NO_STORE_HEADERS,
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="datemate-plan-${id}.ics"`,
    },
  });
});
