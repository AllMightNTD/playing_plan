import { NextRequest } from "next/server";
import { handleRoute, jsonData } from "@/server/http/route";
import { requireAdmin } from "@/server/auth/admin-auth";
import { publishPlace } from "@/server/services/admin/place-admin.service";

export const POST = handleRoute(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  return jsonData(await publishPlace(admin, id));
});
