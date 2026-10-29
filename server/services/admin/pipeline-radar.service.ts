import { db } from "@/server/db/client";
import { places } from "@/server/db/schema/places";
import {
  candidatePlaces,
  placeVideos,
  pipelineRuns,
} from "@/server/db/schema/governance";
import { auditLogs } from "@/server/db/schema/audit";
import { videoCatalog, videoHotspots } from "@/server/db/schema/videos";
import { formatTimestamp } from "@/lib/video-chapters";
import { getQuotaStatus, MAX_DAILY_YOUTUBE_QUOTA } from "@/server/services/youtube/quota-ledger";
import { sql, eq, desc, and } from "drizzle-orm";
import * as crypto from "crypto";
import { AppError, ERRORS } from "@/server/http/errors";
import { revalidatePlaceCatalog } from "@/server/services/cache/revalidation";
import {
  countGradesSince,
  insertSampleGrade,
  notGraded,
} from "@/server/db/queries/admin/pipeline-control.queries";
import {
  SYSTEM_ACTOR,
  getPublishPauseState,
  setPublishPaused,
  type PublishPauseState,
} from "@/server/services/pipeline/pipeline-control.service";

export interface PipelineStats {
  quota: {
    used: number;
    max: number;
    isHalted: boolean;
    quotaDate: string;
  };
  places: {
    totalPublished: number;
    tierACount: number;
    tierBCount: number;
    autoPromotedCount: number;
  };
  videos: {
    autoLinkedCount: number;
    pendingReviewCount: number;
  };
  rolling7DayAccuracy: number | null;
  gradedSampleCount: number;
  autoPause: boolean;
  pause: PublishPauseState;
}

export interface PipelineEventItem {
  id: string;
  type: string;
  title: string;
  status: string;
  createdAt: string;
  details?: Record<string, unknown>;
}

export interface SampleCardItem {
  id: string;
  type: "place" | "video" | "hotspot";
  title: string;
  subtitle: string;
  details: string;
  category?: string;
  datingScore?: number;
  confidenceScore?: number;
  meta: Record<string, unknown>;
}

const ROLLING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
/** Chưa đủ mẫu thì không tính phanh, tránh 1 lượt chấm sai đầu tiên kéo accuracy về 0% */
export const MIN_GRADES_FOR_BREAKER = 10;
export const ACCURACY_BREAKER_THRESHOLD = 85.0;

/** Tỷ lệ đúng trong 7 ngày gần nhất (bảng pipeline_sample_grades); null khi chưa có lượt chấm nào. */
async function computeRollingAccuracy(now: Date): Promise<{ accuracy: number | null; sampleSize: number }> {
  const { total, correct } = await countGradesSince(new Date(now.getTime() - ROLLING_WINDOW_MS));
  if (total === 0) return { accuracy: null, sampleSize: 0 };
  return { accuracy: Number(((correct / total) * 100).toFixed(1)), sampleSize: total };
}

/**
 * Lấy số liệu thống kê tổng quan của Pipeline Radar.
 */
export async function getPipelineRadarStats(): Promise<PipelineStats> {
  const quota = await getQuotaStatus();

  // Thống kê địa điểm public
  const [placesAgg] = await db
    .select({
      total: sql<number>`COUNT(*)`,
      tierA: sql<number>`SUM(CASE WHEN tier = 'A' THEN 1 ELSE 0 END)`,
      tierB: sql<number>`SUM(CASE WHEN tier = 'B' THEN 1 ELSE 0 END)`,
      autoPromoted: sql<number>`SUM(CASE WHEN batch_id IS NOT NULL THEN 1 ELSE 0 END)`,
    })
    .from(places)
    .where(eq(places.status, "published"));

  // Thống kê video
  const [videosAgg] = await db
    .select({
      autoLinked: sql<number>`SUM(CASE WHEN status = 'auto_linked' THEN 1 ELSE 0 END)`,
      pendingReview: sql<number>`SUM(CASE WHEN status = 'pending_review' THEN 1 ELSE 0 END)`,
    })
    .from(placeVideos);

  const [{ accuracy: rolling7DayAccuracy, sampleSize: gradedSampleCount }, pause] = await Promise.all([
    computeRollingAccuracy(new Date()),
    getPublishPauseState(),
  ]);

  return {
    quota: {
      used: quota.unitsUsed,
      max: MAX_DAILY_YOUTUBE_QUOTA,
      isHalted: quota.isHalted || quota.unitsUsed >= MAX_DAILY_YOUTUBE_QUOTA,
      quotaDate: quota.quotaDate,
    },
    places: {
      totalPublished: Number(placesAgg?.total || 0),
      tierACount: Number(placesAgg?.tierA || 0),
      tierBCount: Number(placesAgg?.tierB || 0),
      autoPromotedCount: Number(placesAgg?.autoPromoted || 0),
    },
    videos: {
      autoLinkedCount: Number(videosAgg?.autoLinked || 0),
      pendingReviewCount: Number(videosAgg?.pendingReview || 0),
    },
    rolling7DayAccuracy,
    gradedSampleCount,
    autoPause: pause.isPaused,
    pause,
  };
}

/**
 * Lấy 20 sự kiện tự động gần nhất từ pipelineRuns.
 */
export async function getPipelineEvents(): Promise<PipelineEventItem[]> {
  const runs = await db
    .select()
    .from(pipelineRuns)
    .orderBy(desc(pipelineRuns.startedAt))
    .limit(20);

  return runs.map((r) => {
    let title = "";
    switch (r.runType) {
      case "osm_ingest":
        title = "Quét & nạp ứng viên địa điểm từ OpenStreetMap";
        break;
      case "youtube_scrape":
        title = "Đồng bộ video mới từ các kênh YouTube đối tác";
        break;
      case "video_match":
        title = "Đối sánh M:N liên kết video review và quán";
        break;
      case "shadow_eval":
        title = "Đánh giá xếp hạng ngầm (Shadow Mode Engine)";
        break;
      case "auto_promote":
        title = `Tự động thăng hạng địa điểm vào danh mục public (${r.promotedCount} quán)`;
        break;
      case "maintenance":
        title = "Bảo trì & đối soát hạn mức YouTube định kỳ";
        break;
      default:
        title = `Thực thi tác vụ pipeline: ${r.runType}`;
    }

    return {
      id: r.id,
      type: r.runType,
      title,
      status: r.status,
      createdAt: r.startedAt.toISOString(),
      details: (r.summaryJson as Record<string, unknown>) || {},
    };
  });
}

/**
 * Lấy 10 thẻ mẫu ngẫu nhiên (5 quán + 5 video) để Admin chấm kiểm toán hàng ngày trong 3 phút.
 */
export async function getSampleCardsForGrading(): Promise<SampleCardItem[]> {
  const cards: SampleCardItem[] = [];

  // 1. Lấy 5 quán từ candidatePlaces hoặc places
  const sampleCandidates = await db
    .select()
    .from(candidatePlaces)
    .where(
      and(
        eq(candidatePlaces.status, "pending"),
        sql`${candidatePlaces.evaluatedTier} IN ('A', 'B')`,
        notGraded("place", candidatePlaces.id)
      )
    )
    .limit(5);

  for (const c of sampleCandidates) {
    cards.push({
      id: c.id,
      type: "place",
      title: c.name,
      subtitle: `${c.category.toUpperCase()} • Bậc đề xuất: ${c.evaluatedTier || "B"} • Fit: ${c.evaluatedDateFit || "chill"}`,
      details: c.address,
      category: c.category,
      datingScore: c.datingScore,
      meta: {
        osmId: c.osmId,
        rawTags: c.rawTags,
      },
    });
  }

  // 2. Lấy 5 video liên kết từ placeVideos
  const sampleVideos = await db
    .select()
    .from(placeVideos)
    .where(
      and(
        eq(placeVideos.status, "auto_linked"),
        notGraded("video", sql`CONCAT(${placeVideos.placeId}, ':', ${placeVideos.videoId})`)
      )
    )
    .limit(5);

  for (const v of sampleVideos) {
    cards.push({
      id: `${v.placeId}:${v.videoId}`,
      type: "video",
      title: v.channelTitle ? `Kênh: ${v.channelTitle}` : `Video: ${v.videoId}`,
      subtitle: `Khớp độ tin cậy: ${v.confidenceScore}% • Trạng thái: ${v.status}`,
      details: `Liên kết với Place ID: ${v.placeId}`,
      confidenceScore: Number(v.confidenceScore),
      meta: {
        placeId: v.placeId,
        videoId: v.videoId,
        channelId: v.channelId,
        hasPaidPlacement: v.hasPaidPlacement,
      },
    });
  }

  // 3. Lấy 5 mốc địa điểm trong video do máy tự duyệt (AI hoặc chapter) để kiểm toán
  const sampleHotspots = await db
    .select({
      id: videoHotspots.id,
      videoId: videoHotspots.videoId,
      timestampSec: videoHotspots.timestampSec,
      source: videoHotspots.source,
      confidence: videoHotspots.confidence,
      evidence: videoHotspots.evidence,
      label: videoHotspots.label,
      placeName: places.name,
      placeArea: places.area,
      videoTitle: videoCatalog.title,
    })
    .from(videoHotspots)
    .innerJoin(places, eq(places.id, videoHotspots.placeId))
    .innerJoin(videoCatalog, eq(videoCatalog.videoId, videoHotspots.videoId))
    .where(
      and(
        eq(videoHotspots.status, "verified"),
        sql`${videoHotspots.source} IN ('ai', 'chapter')`,
        notGraded("hotspot", videoHotspots.id)
      )
    )
    .orderBy(sql`RAND()`)
    .limit(5);

  for (const h of sampleHotspots) {
    const watchUrl = `https://www.youtube.com/watch?v=${h.videoId}&t=${h.timestampSec}s`;
    cards.push({
      id: h.id,
      type: "hotspot",
      title: `${h.placeName} @ ${formatTimestamp(h.timestampSec)}`,
      subtitle: `${h.source === "ai" ? "AI" : "Chapter"}${h.confidence ? ` • tin cậy ${h.confidence}` : ""} • ${h.videoTitle}`,
      details: h.evidence || `Nhãn: ${h.label ?? h.placeName} (${h.placeArea})`,
      confidenceScore: h.confidence ? Math.round(Number(h.confidence) * 100) : undefined,
      meta: { videoId: h.videoId, timestampSec: h.timestampSec, watchUrl },
    });
  }

  return cards;
}

/**
 * Xử lý kết quả chấm thẻ kiểm toán từ Admin.
 * Nếu độ chính xác rolling rớt dưới 85% -> tự động bật phanh khẩn cấp auto_pause.
 */
export async function gradeSampleItem(
  input: {
    itemId: string;
    type: "place" | "video" | "hotspot";
    isCorrect: boolean;
    feedback?: string;
  },
  gradedBy: string
): Promise<{ success: boolean; newRollingAccuracy: number | null; autoPaused: boolean }> {
  const now = new Date();
  await insertSampleGrade({
    itemId: input.itemId,
    itemType: input.type,
    isCorrect: input.isCorrect,
    feedback: input.feedback?.trim() || null,
    gradedBy,
    gradedAt: now,
  });

  // Video đã chấm thì chốt trạng thái liên kết: đúng → verified, sai → rejected
  if (input.type === "video") {
    const [placeId, videoId] = input.itemId.split(":");
    if (placeId && videoId) {
      await db
        .update(placeVideos)
        .set({ status: input.isCorrect ? "verified" : "rejected" })
        .where(and(eq(placeVideos.placeId, placeId), eq(placeVideos.videoId, videoId)));
    }
  }

  // Mốc tự động bị chấm sai thì gỡ khỏi người dùng ngay
  if (input.type === "hotspot" && !input.isCorrect) {
    await db
      .update(videoHotspots)
      .set({ status: "rejected", verifiedBy: gradedBy, updatedAt: now })
      .where(eq(videoHotspots.id, input.itemId));
  }

  const { accuracy: newRollingAccuracy, sampleSize } = await computeRollingAccuracy(now);

  // Circuit breaker: accuracy < 85% trên đủ số mẫu thì bật phanh publish (lưu DB, cron đọc được)
  let autoPaused = false;
  if (
    newRollingAccuracy !== null &&
    sampleSize >= MIN_GRADES_FOR_BREAKER &&
    newRollingAccuracy < ACCURACY_BREAKER_THRESHOLD
  ) {
    const pause = await getPublishPauseState();
    if (!pause.isPaused) {
      await setPublishPaused(
        true,
        SYSTEM_ACTOR,
        `Accuracy 7 ngày ${newRollingAccuracy}% < ${ACCURACY_BREAKER_THRESHOLD}% trên ${sampleSize} mẫu`
      );
      console.warn(`[CIRCUIT BREAKER] Accuracy ${newRollingAccuracy}% trên ${sampleSize} mẫu. Đã bật phanh publish.`);
    }
    autoPaused = true;
  }

  return { success: true, newRollingAccuracy, autoPaused };
}

/** Admin gỡ (hoặc bật) phanh publish thủ công, bắt buộc ghi lý do để kiểm toán. */
export async function setPublishPauseByAdmin(adminEmail: string, isPaused: boolean, reason: string): Promise<PublishPauseState> {
  const pause = await getPublishPauseState();
  if (pause.source === "env") {
    throw new AppError(ERRORS.COMMON.VALIDATION_FAILED, { pause: "EMERGENCY_HALT_PUBLISH đang bật, gỡ trong biến môi trường" });
  }
  await setPublishPaused(isPaused, adminEmail, reason);
  return getPublishPauseState();
}

/**
 * Thu hồi toàn bộ các địa điểm thuộc batchId từ published về draft/downgraded trong 1 transaction.
 */
export async function rollbackBatch(batchId: string): Promise<{ affectedCount: number }> {
  if (!batchId) {
    throw new AppError(ERRORS.COMMON.VALIDATION_FAILED, { batchId: "Batch ID là bắt buộc" });
  }

  const runId = crypto.randomUUID();

  // Chạy cập nhật nguyên tử
  const result = await db.transaction(async (tx) => {
    // 1. Chuyển places thuộc batchId về downgraded/draft
    await tx
      .update(places)
      .set({
        publishState: "downgraded",
        status: "draft",
        updatedAt: new Date(),
      })
      .where(eq(places.batchId, batchId));

    // 2. Ghi nhật ký vào pipeline_runs
    await tx.insert(pipelineRuns).values({
      id: runId,
      runType: "maintenance",
      startedAt: new Date(),
      finishedAt: new Date(),
      status: "success",
      quotaUsed: 0,
      promotedCount: 0,
      summaryJson: {
        action: "rollback_batch",
        batchId,
        revertedAt: new Date().toISOString(),
      },
    });

    // 3. Đếm số lượng ảnh hưởng
    const [countRow] = await tx
      .select({ count: sql<number>`COUNT(*)` })
      .from(places)
      .where(eq(places.batchId, batchId));

    return Number(countRow?.count || 0);
  });

  // Kích hoạt On-demand Revalidation làm mới ngay cache ISR cho người dùng
  await revalidatePlaceCatalog();

  return { affectedCount: result };
}
