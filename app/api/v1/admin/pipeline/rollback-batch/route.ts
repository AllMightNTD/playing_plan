import { NextRequest } from "next/server";
import { handleRoute, jsonData, parseJsonBody } from "@/server/http/route";
import { requireAdmin } from "@/server/auth/admin-auth";
import { rollbackBatch } from "@/server/services/admin/pipeline-radar.service";
import { z } from "zod";

const rollbackBatchBodySchema = z.object({
  batchId: z.string().min(1, "Batch ID không được để trống"),
});

export const POST = handleRoute(async (req: NextRequest) => {
  await requireAdmin();
  const body = await parseJsonBody(req, rollbackBatchBodySchema);
  const result = await rollbackBatch(body.batchId);
  return jsonData(result);
});
