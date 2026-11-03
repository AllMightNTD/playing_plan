import { NextRequest } from "next/server";
import { handleRoute, jsonData } from "@/server/http/route";
import { requireAdmin } from "@/server/auth/admin-auth";
import {
  enrichSinglePlaceMap,
  enrichPlacesMapBatch,
} from "@/server/services/admin/place-map-enrich.service";

export const POST = handleRoute(async (req: NextRequest) => {
  await requireAdmin();

  let body: { placeId?: string; limit?: number; onlyGeneric?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    // Body rỗng -> chạy batch mặc định
  }

  if (body.placeId) {
    const result = await enrichSinglePlaceMap(body.placeId);
    return jsonData({ success: true, data: result });
  }

  const result = await enrichPlacesMapBatch({
    limit: body.limit,
    onlyGeneric: body.onlyGeneric,
  });

  return jsonData({ success: true, data: result });
});
