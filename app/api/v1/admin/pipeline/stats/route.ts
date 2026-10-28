import { NextRequest, NextResponse } from "next/server";
import { handleRoute, jsonData } from "@/server/http/route";
import { requireAdmin } from "@/server/auth/admin-auth";
import { getPipelineRadarStats } from "@/server/services/admin/pipeline-radar.service";
import * as crypto from "crypto";

export const GET = handleRoute(async (req: NextRequest) => {
  await requireAdmin();
  const stats = await getPipelineRadarStats();

  // Tạo ETag dựa trên nội dung JSON
  const hash = crypto.createHash("md5").update(JSON.stringify(stats)).digest("hex");
  const etag = `"${hash}"`;

  // Kiểm tra If-None-Match từ client
  const clientEtag = req.headers.get("if-none-match");
  if (clientEtag && clientEtag === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        ETag: etag,
        "Cache-Control": "no-cache",
      },
    });
  }

  return jsonData(stats, {
    headers: {
      ETag: etag,
      "Cache-Control": "no-cache",
    },
  });
});
