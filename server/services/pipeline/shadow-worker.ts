import { db, DbExecutor } from "@/server/db/client";
import {
  candidatePlaces,
  placeBlocklist,
  placeVideos,
  pipelineRuns,
} from "@/server/db/schema/governance";
import { getQuotaStatus, MAX_DAILY_YOUTUBE_QUOTA } from "@/server/services/youtube/quota-ledger";
import { sql, eq, not, and } from "drizzle-orm";
import * as crypto from "crypto";

export interface ShadowWorkerOptions {
  batchId?: string;
  simulateLimitExceeded?: boolean;
  executor?: DbExecutor;
}

export interface ShadowRunResult {
  runId: string;
  batchId: string;
  status: "success" | "paused" | "failed";
  quotaUsed: number;
  totalEvaluated: number;
  tierACount: number;
  tierBCount: number;
  tierCCount: number;
  rejectedCount: number;
  autoLinkedVideosCount: number;
  pendingReviewVideosCount: number;
  reason?: string;
}

/**
 * Phân loại định vị hẹn hò (date_fit) dựa trên từ khóa và đặc tính thực tế.
 */
export function classifyDateFit(name: string, rawTags: Record<string, string> = {}): "romantic" | "chill" | "casual" | "fun" {
  const nameLower = name.toLowerCase();
  const tagsStr = JSON.stringify(rawTags).toLowerCase();

  // 1. Quán ăn no say, quán bình dân, lẩu nướng -> casual
  if (
    nameLower.includes("nướng") ||
    nameLower.includes("lẩu") ||
    nameLower.includes("phở") ||
    nameLower.includes("bún") ||
    nameLower.includes("béo") ||
    nameLower.includes("quán ăn") ||
    nameLower.includes("cơm") ||
    nameLower.includes("bánh cuốn") ||
    nameLower.includes("bia")
  ) {
    return "casual";
  }

  // 2. Không gian sang trọng, rooftop, cocktail, fine dining -> romantic
  if (
    nameLower.includes("bar") ||
    nameLower.includes("lounge") ||
    nameLower.includes("rooftop") ||
    nameLower.includes("wine") ||
    nameLower.includes("khuê") ||
    nameLower.includes("fine dining") ||
    nameLower.includes("steak") ||
    tagsStr.includes("fine_dining")
  ) {
    return "romantic";
  }

  // 3. Cafe sân vườn, view hồ, không gian thư giãn -> chill
  if (
    rawTags.outdoor_seating === "yes" ||
    nameLower.includes("garden") ||
    nameLower.includes("chill") ||
    nameLower.includes("hồ") ||
    nameLower.includes("cafe") ||
    nameLower.includes("cà phê") ||
    nameLower.includes("coffee") ||
    nameLower.includes("tea")
  ) {
    return "chill";
  }

  return "chill";
}

/**
 * Xếp hạng bậc Tier (A, B, C) dựa trên ngưỡng khoa học đã kiểm chuẩn ở Phase 1.
 */
export function evaluateCandidateTier(
  datingScore: number,
  rawTags: Record<string, string> = {}
): "A" | "B" | "C" {
  const hasContact = !!rawTags.phone || !!rawTags.website;

  // Tier A: Điểm >= 70 và có thông tin liên lạc xác thực (phone hoặc website) (Precision 87.5% - 100%)
  if (datingScore >= 70 && hasContact) {
    return "A";
  }

  // Tier B: Điểm >= 55 (đạt chuẩn tuyển chọn hẹn hò, cần xác minh thêm)
  if (datingScore >= 55) {
    return "B";
  }

  // Tier C: Dưới 55 hoặc quán sơ sài
  return "C";
}

/**
 * Shadow Worker: Động cơ phân tích & xếp hạng ngầm.
 * Tuyệt đối cách ly: Chỉ lưu trạng thái vào candidate_places và place_videos, KHÔNG chèn vào places public.
 */
export async function runShadowWorker(options?: ShadowWorkerOptions): Promise<ShadowRunResult> {
  const executor = options?.executor ?? db;
  const runId = crypto.randomUUID();
  const batchId = options?.batchId || `batch_shadow_${Date.now()}`;
  const now = new Date();

  // 1. Kiểm tra Quota Ledger trước khi làm bất kỳ việc gì
  const quota = await getQuotaStatus(new Date(), executor);
  if (options?.simulateLimitExceeded || quota.isHalted || quota.unitsUsed >= MAX_DAILY_YOUTUBE_QUOTA) {
    // Ghi nhận run dạng paused do chạm trần hạn mức
    await executor.insert(pipelineRuns).values({
      id: runId,
      runType: "shadow_eval",
      startedAt: now,
      finishedAt: new Date(),
      status: "paused",
      quotaUsed: quota.unitsUsed,
      promotedCount: 0,
      summaryJson: {
        reason: "Daily YouTube quota limit reached or halted",
        limit: MAX_DAILY_YOUTUBE_QUOTA,
        unitsUsed: quota.unitsUsed,
      },
    });

    return {
      runId,
      batchId,
      status: "paused",
      quotaUsed: quota.unitsUsed,
      totalEvaluated: 0,
      tierACount: 0,
      tierBCount: 0,
      tierCCount: 0,
      rejectedCount: 0,
      autoLinkedVideosCount: 0,
      pendingReviewVideosCount: 0,
      reason: "Hạn mức YouTube API đã đạt ngưỡng an toàn (8,000 units/ngày)",
    };
  }

  // 2. Tạo bản ghi pipelineRuns trạng thái running
  await db.insert(pipelineRuns).values({
    id: runId,
    runType: "shadow_eval",
    startedAt: now,
    status: "running",
    quotaUsed: quota.unitsUsed,
    promotedCount: 0,
  });

  try {
    // 3. Lấy danh sách blocklist để lọc
    const blocklists = await db.select().from(placeBlocklist);
    const blockedOsmIds = new Set(blocklists.filter((b) => b.osmId).map((b) => b.osmId!));
    const blockedPatterns = blocklists.filter((b) => b.namePattern).map((b) => b.namePattern!.toLowerCase());

    // 4. Lấy các ứng viên chưa bị reject từ candidate_places
    const candidates = await db
      .select()
      .from(candidatePlaces)
      .where(not(eq(candidatePlaces.status, "rejected")));

    let tierACount = 0;
    let tierBCount = 0;
    let tierCCount = 0;
    let rejectedCount = 0;

    // 5. Đánh giá và cập nhật bóng vào candidate_places
    for (const c of candidates) {
      const nameLower = c.name.toLowerCase();
      const isBlocked =
        blockedOsmIds.has(c.osmId) ||
        blockedPatterns.some((p) => nameLower.includes(p));

      if (isBlocked) {
        await db
          .update(candidatePlaces)
          .set({
            status: "rejected",
            batchId,
            updatedAt: new Date(),
          })
          .where(eq(candidatePlaces.id, c.id));
        rejectedCount++;
        continue;
      }

      const tags = (c.rawTags || {}) as Record<string, string>;
      const evaluatedTier = evaluateCandidateTier(c.datingScore, tags);
      const evaluatedDateFit = classifyDateFit(c.name, tags);

      if (evaluatedTier === "A") tierACount++;
      else if (evaluatedTier === "B") tierBCount++;
      else tierCCount++;

      // Ghi cập nhật ngầm vào candidate_places (KHÔNG đụng vào bảng places)
      await db
        .update(candidatePlaces)
        .set({
          evaluatedTier,
          evaluatedDateFit,
          batchId,
          updatedAt: new Date(),
        })
        .where(eq(candidatePlaces.id, c.id));
    }

    // 6. Hiệu chuẩn trạng thái liên kết Video trong place_videos dựa trên ngưỡng Phase 1
    // Ngưỡng Auto-link chốt cứng từ Phase 1: >= 65.00
    // Ngưỡng Pending review: 50.00 - 64.99
    // Ngưỡng Rejected: < 50.00
    await db.execute(sql`
      UPDATE place_videos
      SET status = 'auto_linked'
      WHERE CAST(confidence_score AS DECIMAL(5,2)) >= 65.00
    `);

    await db.execute(sql`
      UPDATE place_videos
      SET status = 'pending_review'
      WHERE CAST(confidence_score AS DECIMAL(5,2)) >= 50.00
        AND CAST(confidence_score AS DECIMAL(5,2)) < 65.00
    `);

    await db.execute(sql`
      UPDATE place_videos
      SET status = 'rejected'
      WHERE CAST(confidence_score AS DECIMAL(5,2)) < 50.00
    `);

    const [videoStats] = await db.select({
      autoLinked: sql<number>`SUM(CASE WHEN status = 'auto_linked' THEN 1 ELSE 0 END)`,
      pendingReview: sql<number>`SUM(CASE WHEN status = 'pending_review' THEN 1 ELSE 0 END)`,
    }).from(placeVideos);

    const autoLinkedVideosCount = Number(videoStats?.autoLinked || 0);
    const pendingReviewVideosCount = Number(videoStats?.pendingReview || 0);

    // 7. Hoàn tất ghi nhận pipelineRuns
    const summary = {
      batchId,
      totalCandidates: candidates.length,
      evaluatedTierA: tierACount,
      evaluatedTierB: tierBCount,
      evaluatedTierC: tierCCount,
      rejectedCount,
      autoLinkedVideosCount,
      pendingReviewVideosCount,
    };

    await db
      .update(pipelineRuns)
      .set({
        finishedAt: new Date(),
        status: "success",
        quotaUsed: quota.unitsUsed,
        promotedCount: 0, // Tuyệt đối 0 vì chạy bóng
        summaryJson: summary,
      })
      .where(eq(pipelineRuns.id, runId));

    return {
      runId,
      batchId,
      status: "success",
      quotaUsed: quota.unitsUsed,
      totalEvaluated: candidates.length,
      tierACount,
      tierBCount,
      tierCCount,
      rejectedCount,
      autoLinkedVideosCount,
      pendingReviewVideosCount,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await db
      .update(pipelineRuns)
      .set({
        finishedAt: new Date(),
        status: "failed",
        summaryJson: { error: errorMsg },
      })
      .where(eq(pipelineRuns.id, runId));
    throw err;
  }
}
