import { eq } from "drizzle-orm";
import { db, isDatabaseConfigured } from "@/server/db/client";
import { places } from "@/server/db/schema";
import {
  listVideosPendingAi,
  markVideoAnalyzed,
  sumAnalyzedDurationSince,
} from "@/server/db/queries/videos/video-catalog.queries";
import { insertHotspotsIgnoringDuplicates } from "@/server/db/queries/videos/video-hotspots.queries";
import {
  DEFAULT_VIDEO_AI_MODEL,
  VideoAiQuotaError,
  detectPlaceMentions,
  validateMentions,
  type PlaceCandidate,
} from "@/server/services/ai/video-hotspot-ai.service";
import { getPublishPauseState } from "@/server/services/pipeline/pipeline-control.service";

export const AI_HOTSPOT_ACTOR = "ai:gemini";
/** Free tier Gemini giới hạn ~8 giờ video YouTube/ngày; để dư cho việc khác. */
const DEFAULT_DAILY_BUDGET_SEC = 6 * 60 * 60;
const DEFAULT_MAX_VIDEO_SEC = 60 * 60;
const DEFAULT_MAX_VIDEOS_PER_RUN = 50;
const BUDGET_WINDOW_MS = 24 * 60 * 60 * 1000;
/** Video phân tích lỗi (không phải do hết quota) được thử lại sau 7 ngày. */
const RETRY_FAILED_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export interface AiHotspotRunSummary {
  analyzedVideos: number;
  failedVideos: number;
  verifiedHotspots: number;
  pendingHotspots: number;
  budgetUsedSec: number;
  budgetRemainingSec: number;
  stoppedReason: "done" | "budget" | "quota" | "no_api_key" | "no_database";
  publishPaused: boolean;
}

function readPositiveIntEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

/**
 * Cho AI xem các video chưa phân tích để tìm mốc địa điểm, trong giới hạn ngân sách giây video mỗi 24 giờ.
 * Mốc đủ tin cậy được tự duyệt (trừ khi phanh publish đang bật), còn lại để pending; tất cả vào mẫu chấm hằng ngày.
 */
export async function runAiVideoHotspots(options: { maxVideos?: number; now?: Date } = {}): Promise<AiHotspotRunSummary> {
  const now = options.now ?? new Date();
  const summary: AiHotspotRunSummary = {
    analyzedVideos: 0,
    failedVideos: 0,
    verifiedHotspots: 0,
    pendingHotspots: 0,
    budgetUsedSec: 0,
    budgetRemainingSec: 0,
    stoppedReason: "done",
    publishPaused: false,
  };

  if (!isDatabaseConfigured()) return { ...summary, stoppedReason: "no_database" };
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return { ...summary, stoppedReason: "no_api_key" };

  const model = process.env.GEMINI_VIDEO_MODEL?.trim() || DEFAULT_VIDEO_AI_MODEL;
  const dailyBudgetSec = readPositiveIntEnv("AI_HOTSPOT_DAILY_VIDEO_SECONDS", DEFAULT_DAILY_BUDGET_SEC);
  const maxVideoSec = readPositiveIntEnv("AI_HOTSPOT_MAX_VIDEO_SECONDS", DEFAULT_MAX_VIDEO_SEC);

  const [usedSec, pause, videos, placeRows] = await Promise.all([
    sumAnalyzedDurationSince(new Date(now.getTime() - BUDGET_WINDOW_MS)),
    getPublishPauseState(),
    listVideosPendingAi(
      maxVideoSec,
      options.maxVideos ?? DEFAULT_MAX_VIDEOS_PER_RUN,
      new Date(now.getTime() - RETRY_FAILED_AFTER_MS)
    ),
    db.select({ id: places.id, name: places.name, area: places.area }).from(places).where(eq(places.status, "published")),
  ]);
  summary.publishPaused = pause.isPaused;
  const candidates: PlaceCandidate[] = placeRows.map((p) => ({ id: p.id, name: p.name, area: p.area ?? "" }));
  let remaining = dailyBudgetSec - usedSec;

  for (const video of videos) {
    const durationSec = video.durationSec ?? 0;
    if (durationSec > remaining) {
      summary.stoppedReason = "budget";
      break;
    }

    try {
      const mentions = await detectPlaceMentions({ apiKey, model, videoId: video.videoId, videoTitle: video.title, candidates });
      const validated = validateMentions(mentions, candidates, durationSec, !pause.isPaused);
      const at = new Date();
      await insertHotspotsIgnoringDuplicates(
        validated.map((m) => ({
          videoId: video.videoId,
          placeId: m.placeId,
          timestampSec: m.timestampSec,
          label: m.label,
          source: "ai" as const,
          confidence: m.confidence.toFixed(2),
          evidence: m.evidence,
          status: m.autoVerify ? ("verified" as const) : ("pending" as const),
          createdBy: AI_HOTSPOT_ACTOR,
          verifiedBy: m.autoVerify ? AI_HOTSPOT_ACTOR : null,
          createdAt: at,
          updatedAt: at,
        }))
      );
      await markVideoAnalyzed(video.videoId, { model, error: null, at });
      summary.analyzedVideos++;
      summary.verifiedHotspots += validated.filter((m) => m.autoVerify).length;
      summary.pendingHotspots += validated.filter((m) => !m.autoVerify).length;
      console.log(`[AI Hotspots] ${video.videoId}: ${validated.length} mốc hợp lệ / ${mentions.length} AI đề xuất`);
    } catch (err) {
      // Hết quota thì dừng cả lượt, không đánh dấu video để lần sau chạy lại
      if (err instanceof VideoAiQuotaError) {
        summary.stoppedReason = "quota";
        break;
      }
      const message = err instanceof Error ? err.message : String(err);
      await markVideoAnalyzed(video.videoId, { model, error: message.slice(0, 1000), at: new Date() });
      summary.failedVideos++;
      console.warn(`[AI Hotspots] ${video.videoId} lỗi: ${message}`);
    }

    remaining -= durationSec;
    summary.budgetUsedSec += durationSec;
  }

  summary.budgetRemainingSec = Math.max(0, remaining);
  return summary;
}
