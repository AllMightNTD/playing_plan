import { NextRequest } from "next/server";
import { handleRoute, jsonData, NO_STORE_HEADERS } from "@/server/http/route";
import { findPlaceBySlug } from "@/server/services/user/places.service";
import { AppError, ERRORS } from "@/server/http/errors";

export const POST = handleRoute(async (_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  const place = await findPlaceBySlug(slug);

  if (!place) {
    throw new AppError(ERRORS.PLACE.NOT_FOUND);
  }

  // Tăng lượt xem (non-blocking log/counter)
  // Trong môi trường production, có thể ghi nhận vào audit_logs hoặc redis
  return jsonData({ ok: true, slug }, { headers: NO_STORE_HEADERS });
});
