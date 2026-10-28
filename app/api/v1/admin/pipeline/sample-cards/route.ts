import { NextRequest } from "next/server";
import { handleRoute, jsonData } from "@/server/http/route";
import { requireAdmin } from "@/server/auth/admin-auth";
import { getSampleCardsForGrading } from "@/server/services/admin/pipeline-radar.service";

export const GET = handleRoute(async (_req: NextRequest) => {
  await requireAdmin();
  const cards = await getSampleCardsForGrading();
  return jsonData(cards);
});
