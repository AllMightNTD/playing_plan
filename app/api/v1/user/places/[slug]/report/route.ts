import { NextRequest } from "next/server";
import { handleRoute, jsonData, parseJsonBody } from "@/server/http/route";
import { db } from "@/server/db/client";
import { places } from "@/server/db/schema/places";
import { placeReports } from "@/server/db/schema/governance";
import { AppError, ERRORS } from "@/server/http/errors";
import { sql, eq } from "drizzle-orm";
import * as crypto from "crypto";
import { z } from "zod";

const reportBodySchema = z.object({
  reason: z.enum([
    "closed",
    "wrong_hours",
    "wrong_price",
    "wrong_location",
    "inappropriate",
  ]),
  details: z.string().max(500).optional(),
});

// Bộ nhớ đệm giới hạn tần suất (Rate Limiter: 5 báo cáo / giờ / IP)
const ipReportRateLimit = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = ipReportRateLimit.get(ip);

  if (!limit || now > limit.resetAt) {
    ipReportRateLimit.set(ip, { count: 1, resetAt: now + 3600000 }); // 1 giờ
    return true;
  }

  if (limit.count >= 5) {
    return false;
  }

  limit.count += 1;
  return true;
}

export const POST = handleRoute(async (req: NextRequest, { params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;

  // 1. Tìm place theo slug
  const [place] = await db
    .select({ id: places.id, name: places.name })
    .from(places)
    .where(eq(places.slug, slug))
    .limit(1);

  if (!place) {
    throw new AppError(ERRORS.PLACE.NOT_FOUND);
  }

  // 2. Kiểm tra Rate Limit theo IP
  const forwardedFor = req.headers.get("x-forwarded-for");
  const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";
  const userAgent = req.headers.get("user-agent") || "unknown";

  if (!checkRateLimit(ip)) {
    throw new AppError(ERRORS.COMMON.RATE_LIMITED);
  }

  // 3. Tạo client_hash ẩn danh từ SHA-256(ip + ua + salt)
  const salt = process.env.REPORT_SALT || "datemate_anti_sabotage_salt_2026";
  const clientHash = crypto
    .createHash("sha256")
    .update(`${ip}:${userAgent}:${salt}`)
    .digest("hex");

  // 4. Parse body
  const body = await parseJsonBody(req, reportBodySchema);

  // 5. Lưu báo cáo vào place_reports
  const reportId = crypto.randomUUID();
  await db.insert(placeReports).values({
    id: reportId,
    placeId: place.id,
    reason: body.reason,
    details: body.details || null,
    clientHash,
    status: "pending",
    createdAt: new Date(),
  });

  // 6. Quy tắc Anti-Sabotage: Chỉ khi tích lũy >= 3 báo cáo từ 3 client_hash phân biệt
  const [distinctAgg] = await db
    .select({
      distinctCount: sql<number>`COUNT(DISTINCT ${placeReports.clientHash})`,
    })
    .from(placeReports)
    .where(eq(placeReports.placeId, place.id));

  const distinctReports = Number(distinctAgg?.distinctCount || 0);

  if (distinctReports >= 3) {
    // Quán bị cảnh báo cần kiểm duyệt (under_review)
    console.warn(
      `[ANTI-SABOTAGE] Địa điểm ${place.name} (${place.id}) đã nhận ${distinctReports} báo cáo từ các thiết bị độc lập! Đã đưa vào diện under_review.`
    );
  }

  return jsonData({
    success: true,
    message: "Báo cáo của bạn đã được ghi nhận. Cảm ơn bạn đã đóng góp cho cộng đồng!",
  });
});
