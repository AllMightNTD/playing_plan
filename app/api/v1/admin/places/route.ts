import { NextRequest } from "next/server";
import { handleRoute, jsonData, parseJsonBody, parseSearchParams } from "@/server/http/route";
import { requireAdmin } from "@/server/auth/admin-auth";
import { adminPlaceListQuerySchema, createPlaceBodySchema } from "@/lib/validators/admin";
import { createPlace, listPlacesForAdmin } from "@/server/services/admin/place-admin.service";

export const GET = handleRoute(async (req: NextRequest) => {
  await requireAdmin();
  const query = parseSearchParams(req, adminPlaceListQuerySchema);
  return jsonData(await listPlacesForAdmin(query));
});

export const POST = handleRoute(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const body = await parseJsonBody(req, createPlaceBodySchema);
  return jsonData(await createPlace(admin, body), { status: 201 });
});
