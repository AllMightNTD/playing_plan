import { NextRequest } from "next/server";
import { handleRoute, jsonData, parseJsonBody } from "@/server/http/route";
import { requireAdmin } from "@/server/auth/admin-auth";
import { aiExtractBodySchema } from "@/lib/validators/admin";
import { extractGuideDraft } from "@/server/services/admin/ai-extractor.service";

export const POST = handleRoute(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const body = await parseJsonBody(req, aiExtractBodySchema);
  return jsonData(await extractGuideDraft(admin, body.text));
});
