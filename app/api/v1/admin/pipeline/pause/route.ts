import { NextRequest } from "next/server";
import { z } from "zod";
import { handleRoute, jsonData, parseJsonBody } from "@/server/http/route";
import { requireAdmin } from "@/server/auth/admin-auth";
import { setPublishPauseByAdmin } from "@/server/services/admin/pipeline-radar.service";
import { getPublishPauseState } from "@/server/services/pipeline/pipeline-control.service";

const pauseBodySchema = z
  .object({
    isPaused: z.boolean(),
    reason: z.string().trim().min(3).max(500),
  })
  .strict();

export const GET = handleRoute(async () => {
  await requireAdmin();
  return jsonData(await getPublishPauseState());
});

/** Bật hoặc gỡ phanh publish của pipeline; lý do được ghi vào audit log. */
export const POST = handleRoute(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const body = await parseJsonBody(req, pauseBodySchema);
  return jsonData(await setPublishPauseByAdmin(admin.email, body.isPaused, body.reason));
});
