import { db } from "@/server/db/client";
import { places, NewPlace } from "@/server/db/schema/places";
import {
  candidatePlaces,
  placeBlocklist,
  placeReports,
  placeVideos,
  pipelineRuns,
} from "@/server/db/schema/governance";
import { getQuotaStatus, MAX_DAILY_YOUTUBE_QUOTA } from "@/server/services/youtube/quota-ledger";
import { assertPublishNotHalted, isCandidateBlocklisted } from "@/server/services/admin/governance.policy";
import { revalidatePlaceCatalog } from "@/server/services/cache/revalidation";
import { sql, eq, and, not, desc, inArray } from "drizzle-orm";
import * as crypto from "crypto";
import { toSlug } from "@/lib/search";

export type RampUpStage = 1 | 2 | 3;

/**
 * Lấy hạn mức xuất bản hàng ngày theo từng nấc chiến lược mở van (Mục 1.1).
 * Nấc 1 (Tuần 1): 10 quán/ngày
 * Nấc 2 (Tuần 2): 20 quán/ngày (khi Rolling Accuracy >= 85% và Tỷ lệ báo sai < 3%)
 * Nấc 3 (Tuần 3+): 50 quán/ngày (Tự hành hoàn toàn)
 */
export function getDailyPublishLimit(stage: RampUpStage = 1): number {
  switch (stage) {
    case 1:
      return 10;
    case 2:
      return 20;
    case 3:
      return 50;
    default:
      return 10;
  }
}

export interface ControlledPromotionOptions {
  stage?: RampUpStage;
  maxPlaces?: number;
  batchId?: string;
}

export interface PromotionResult {
  runId: string;
  batchId: string;
  status: "success" | "paused" | "failed";
  promotedCount: number;
  promotedPlaceIds: string[];
  rejectedByBlocklistCount: number;
  reason?: string;
}

/**
 * Thực thi đợt thăng hạng tự động có kiểm soát (Controlled Promotion).
 * Áp dụng nghiêm ngặt cả 4 phanh an toàn tự động (Circuit Breakers).
 */
export async function runControlledPromotion(
  options?: ControlledPromotionOptions
): Promise<PromotionResult> {
  const runId = crypto.randomUUID();
  const batchId = options?.batchId || `batch_auto_promote_${Date.now()}`;
  const now = new Date();

  // 1. Phanh 2: Kiểm tra Kill Switch khẩn cấp
  assertPublishNotHalted();

  // 2. Kiểm tra Quota YouTube
  const quota = await getQuotaStatus();
  if (quota.isHalted || quota.unitsUsed >= MAX_DAILY_YOUTUBE_QUOTA) {
    await db.insert(pipelineRuns).values({
      id: runId,
      runType: "auto_promote",
      startedAt: now,
      finishedAt: new Date(),
      status: "paused",
      quotaUsed: quota.unitsUsed,
      promotedCount: 0,
      summaryJson: { reason: "Quota limit reached" },
    });
    return {
      runId,
      batchId,
      status: "paused",
      promotedCount: 0,
      promotedPlaceIds: [],
      rejectedByBlocklistCount: 0,
      reason: "Hạn mức YouTube API đã đạt ngưỡng an toàn",
    };
  }

  // 3. Xác định hạn mức van mở
  const limitCount = options?.maxPlaces ?? getDailyPublishLimit(options?.stage ?? 1);

  // 4. Lấy danh sách blocklist
  const blocklist = await db.select().from(placeBlocklist);

  // 5. Tìm các ứng viên Bậc A đạt chuẩn để thăng hạng
  const candidates = await db
    .select()
    .from(candidatePlaces)
    .where(
      and(
        eq(candidatePlaces.status, "pending"),
        eq(candidatePlaces.evaluatedTier, "A")
      )
    )
    .limit(limitCount);

  let promotedCount = 0;
  const promotedPlaceIds: string[] = [];
  let rejectedByBlocklistCount = 0;

  // 6. Giao dịch nguyên tử thăng hạng (Phanh 4: Blocklist Immunity trong transaction)
  await db.transaction(async (tx) => {
    for (const cand of candidates) {
      // Kiểm tra Blocklist
      const isBlocked = isCandidateBlocklisted(
        {
          name: cand.name,
          osmId: cand.osmId,
          lat: Number(cand.lat),
          lng: Number(cand.lng),
        },
        blocklist
      );

      if (isBlocked) {
        await tx
          .update(candidatePlaces)
          .set({ status: "rejected", updatedAt: new Date() })
          .where(eq(candidatePlaces.id, cand.id));
        rejectedByBlocklistCount++;
        continue;
      }

      // Tạo slug duy nhất
      const baseSlug = toSlug(cand.name);
      const uniqueSlug = `${baseSlug}-${cand.id.slice(-6).toLowerCase()}`;

      // Xác định area từ address
      const areaMatch = cand.address.match(/(Hoàn Kiếm|Ba Đình|Tây Hồ|Cầu Giấy|Đống Đa|Hai Bà Trưng|Nam Từ Liêm|Bắc Từ Liêm|Long Biên|Hà Đông)/i);
      const area = areaMatch ? areaMatch[0] : "Hà Nội";

      // Chèn vào bảng places public
      const validCategory = (["cafe", "food", "walk", "fun", "indoor", "nature", "photo"].includes(cand.category)
        ? cand.category
        : "cafe") as "cafe" | "food" | "walk" | "fun" | "indoor" | "nature" | "photo";

      await tx.insert(places).values({
        id: cand.id,
        slug: uniqueSlug,
        name: cand.name,
        displayName: cand.name,
        searchName: cand.searchName,
        city: cand.city,
        area,
        address: cand.address,
        lat: cand.lat,
        lng: cand.lng,
        category: validCategory,
        priceLevel: 2,
        estCostMin: 40000,
        estCostMax: 120000,
        moods: ["chill", "romantic"],
        tags: ["date-worthy", cand.evaluatedDateFit || "chill"],
        indoor: cand.category === "cafe" || cand.category === "food",
        coverUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80",
        summary: `Địa điểm ${cand.name} nằm tại ${cand.address}, mang phong cách ${cand.evaluatedDateFit || "chill"} lý tưởng cho buổi hẹn hò ấm áp.`,
        status: "published",
        publishState: "published",
        tier: "A",
        batchId,
        dateFit: cand.evaluatedDateFit || "chill",
        lastVerifiedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Cập nhật candidate_places sang status promoted
      await tx
        .update(candidatePlaces)
        .set({ status: "promoted", batchId, updatedAt: new Date() })
        .where(eq(candidatePlaces.id, cand.id));

      promotedCount++;
      promotedPlaceIds.push(cand.id);
    }

    // Ghi nhận pipeline_runs
    await tx.insert(pipelineRuns).values({
      id: runId,
      runType: "auto_promote",
      startedAt: now,
      finishedAt: new Date(),
      status: "success",
      quotaUsed: quota.unitsUsed,
      promotedCount,
      summaryJson: {
        batchId,
        stage: options?.stage ?? 1,
        limitCount,
        promotedPlaceIds,
        rejectedByBlocklistCount,
      },
    });
  });

  // 7. Kích hoạt On-demand Revalidation (ISR)
  if (promotedCount > 0) {
    await revalidatePlaceCatalog();
  }

  return {
    runId,
    batchId,
    status: "success",
    promotedCount,
    promotedPlaceIds,
    rejectedByBlocklistCount,
  };
}

/**
 * Phanh 3: Tự động hạ bậc (Auto-Downgrade).
 * - Quán có >= 3 báo cáo sai từ các thiết bị độc lập -> Hạ về Bậc B hoặc Staging/Draft.
 * - Quán quá 365 ngày không có video mới xác nhận hoạt động -> Gắn cờ cảnh báo hoặc hạ bậc.
 */
export async function runAutoDowngradeCheck(): Promise<{
  downgradedByReportsCount: number;
  downgradedByOutdatedCount: number;
}> {
  let downgradedByReportsCount = 0;
  let downgradedByOutdatedCount = 0;

  // 1. Quét theo báo cáo sai cộng đồng
  const reportedPlaces = await db
    .select({
      placeId: placeReports.placeId,
      distinctDevices: sql<number>`COUNT(DISTINCT ${placeReports.clientHash})`,
    })
    .from(placeReports)
    .groupBy(placeReports.placeId)
    .having(sql`COUNT(DISTINCT ${placeReports.clientHash}) >= 3`);

  for (const row of reportedPlaces) {
    // Hạ bậc từ A sang B hoặc downgraded
    await db
      .update(places)
      .set({
        tier: "B",
        publishState: "downgraded",
        updatedAt: new Date(),
      })
      .where(eq(places.id, row.placeId));

    downgradedByReportsCount++;
    console.warn(`[AUTO-DOWNGRADE] Địa điểm ${row.placeId} đã bị hạ bậc do nhận ${row.distinctDevices} báo cáo độc lập!`);
  }

  // 2. Quét các quán không có video mới trong 365 ngày
  const oneYearAgo = new Date();
  oneYearAgo.setDate(oneYearAgo.getDate() - 365);

  const outdatedVideos = await db
    .select({ placeId: placeVideos.placeId })
    .from(placeVideos)
    .groupBy(placeVideos.placeId)
    .having(sql`MAX(${placeVideos.publishedAt}) < ${oneYearAgo}`);

  for (const row of outdatedVideos) {
    await db
      .update(places)
      .set({
        tier: "B",
        updatedAt: new Date(),
      })
      .where(and(eq(places.id, row.placeId), eq(places.tier, "A")));

    downgradedByOutdatedCount++;
  }

  if (downgradedByReportsCount > 0 || downgradedByOutdatedCount > 0) {
    await revalidatePlaceCatalog();
  }

  return {
    downgradedByReportsCount,
    downgradedByOutdatedCount,
  };
}
