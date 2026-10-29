import { NextRequest } from "next/server";
import { handleRoute, jsonData, parseJsonBody } from "@/server/http/route";
import { requireAdmin } from "@/server/auth/admin-auth";
import { gradeSampleItem } from "@/server/services/admin/pipeline-radar.service";
import { z } from "zod";

const gradeSampleBodySchema = z.object({
  itemId: z.string().min(1),
  type: z.enum(["place", "video", "hotspot"]),
  isCorrect: z.boolean(),
  feedback: z.string().optional(),
});

export const POST = handleRoute(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const body = await parseJsonBody(req, gradeSampleBodySchema);
  const result = await gradeSampleItem(body, admin.email);
  return jsonData(result);
});
