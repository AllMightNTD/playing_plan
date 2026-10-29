import { NextRequest } from "next/server";
import { handleRoute, jsonData } from "@/server/http/route";
import { getPublicPlanByShareToken } from "@/server/services/user/plan-rsvp.service";

interface RouteContext {
  params: Promise<{ shareToken: string }>;
}

export const GET = handleRoute(async (_req: NextRequest, context: RouteContext) => {
  const { shareToken } = await context.params;
  const posterData = await getPublicPlanByShareToken(shareToken);
  return jsonData(posterData);
});
