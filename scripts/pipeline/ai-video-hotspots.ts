/**
 * Cho Gemini xem các video trong video_catalog để tìm mốc địa điểm, trong ngân sách giây video/24h.
 * Chạy: pnpm video:ai-hotspots [số-video-tối-đa]
 * Env: GEMINI_API_KEY (bắt buộc), GEMINI_VIDEO_MODEL, AI_HOTSPOT_DAILY_VIDEO_SECONDS, AI_HOTSPOT_MAX_VIDEO_SECONDS
 */
import { runTrackedPipeline } from "@/server/services/pipeline/pipeline-run.service";
import { runAiVideoHotspots } from "@/server/services/videos/ai-hotspots.runner";

const maxVideos = Number(process.argv[2]) || undefined;

runTrackedPipeline("ai_video_hotspots", async () => {
  const summary = await runAiVideoHotspots({ maxVideos });
  console.log("[AI Hotspots] Kết quả:", summary);
  if (summary.stoppedReason === "no_api_key") throw new Error("Chưa cấu hình GEMINI_API_KEY");
  if (summary.stoppedReason === "no_database") throw new Error("Chưa cấu hình DATABASE_URL");
  return { result: summary, summary: { ...summary } };
}).catch((err) => {
  console.error("✗ AI hotspots thất bại:", err);
  process.exit(1);
});
