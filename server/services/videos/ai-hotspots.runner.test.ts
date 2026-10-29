import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runAiVideoHotspots } from "./ai-hotspots.runner";
import {
  listVideosPendingAi,
  markVideoAnalyzed,
  sumAnalyzedDurationSince,
} from "@/server/db/queries/videos/video-catalog.queries";
import { insertHotspotsIgnoringDuplicates } from "@/server/db/queries/videos/video-hotspots.queries";
import { detectPlaceMentions, VideoAiQuotaError } from "@/server/services/ai/video-hotspot-ai.service";
import { getPublishPauseState } from "@/server/services/pipeline/pipeline-control.service";

vi.mock("@/server/db/client", () => ({
  isDatabaseConfigured: () => true,
  db: { select: () => ({ from: () => ({ where: async () => [{ id: "ht", name: "Hồ Tây", area: "Tây Hồ" }] }) }) },
}));
vi.mock("@/server/db/queries/videos/video-catalog.queries", () => ({
  listVideosPendingAi: vi.fn(),
  markVideoAnalyzed: vi.fn(),
  sumAnalyzedDurationSince: vi.fn(),
}));
vi.mock("@/server/db/queries/videos/video-hotspots.queries", () => ({ insertHotspotsIgnoringDuplicates: vi.fn() }));
vi.mock("@/server/services/pipeline/pipeline-control.service", () => ({ getPublishPauseState: vi.fn() }));
vi.mock("@/server/services/ai/video-hotspot-ai.service", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/services/ai/video-hotspot-ai.service")>()),
  detectPlaceMentions: vi.fn(),
}));

const video = (videoId: string, durationSec: number) => ({ videoId, title: `Video ${videoId}`, durationSec }) as never;
const HO_TAY = { placeId: "ht", nameInVideo: "Hồ Tây", timestampSec: 30, evidence: "speech" as const, quote: "ra Hồ Tây", confidence: 0.92 };

describe("runAiVideoHotspots", () => {
  const originalKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = "test-key";
    delete process.env.AI_HOTSPOT_DAILY_VIDEO_SECONDS;
    vi.mocked(sumAnalyzedDurationSince).mockResolvedValue(0);
    vi.mocked(getPublishPauseState).mockResolvedValue({ isPaused: false, source: null, reason: null, updatedBy: null, updatedAt: null });
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalKey;
  });

  it("thiếu GEMINI_API_KEY thì không gọi AI", async () => {
    delete process.env.GEMINI_API_KEY;
    expect((await runAiVideoHotspots()).stoppedReason).toBe("no_api_key");
    expect(detectPlaceMentions).not.toHaveBeenCalled();
  });

  it("lưu mốc AI tự duyệt và đánh dấu video đã phân tích", async () => {
    vi.mocked(listVideosPendingAi).mockResolvedValue([video("v1", 600)]);
    vi.mocked(detectPlaceMentions).mockResolvedValue([HO_TAY]);

    const summary = await runAiVideoHotspots();

    expect(insertHotspotsIgnoringDuplicates).toHaveBeenCalledWith([
      expect.objectContaining({ videoId: "v1", placeId: "ht", timestampSec: 30, source: "ai", status: "verified", confidence: "0.92" }),
    ]);
    expect(markVideoAnalyzed).toHaveBeenCalledWith("v1", expect.objectContaining({ error: null }));
    expect(summary).toMatchObject({ analyzedVideos: 1, verifiedHotspots: 1, budgetUsedSec: 600, stoppedReason: "done" });
  });

  it("dừng khi hết ngân sách giây video trong 24 giờ", async () => {
    process.env.AI_HOTSPOT_DAILY_VIDEO_SECONDS = "1000";
    vi.mocked(sumAnalyzedDurationSince).mockResolvedValue(500);
    vi.mocked(listVideosPendingAi).mockResolvedValue([video("v1", 400), video("v2", 400)]);
    vi.mocked(detectPlaceMentions).mockResolvedValue([]);

    const summary = await runAiVideoHotspots();

    expect(detectPlaceMentions).toHaveBeenCalledTimes(1);
    expect(summary).toMatchObject({ analyzedVideos: 1, stoppedReason: "budget", budgetRemainingSec: 100 });
  });

  it("hết quota Gemini (429) thì dừng và không đánh dấu video để lần sau chạy lại", async () => {
    vi.mocked(listVideosPendingAi).mockResolvedValue([video("v1", 60), video("v2", 60)]);
    vi.mocked(detectPlaceMentions).mockRejectedValue(new VideoAiQuotaError("quota"));

    const summary = await runAiVideoHotspots();

    expect(summary.stoppedReason).toBe("quota");
    expect(markVideoAnalyzed).not.toHaveBeenCalled();
  });

  it("lỗi khác thì ghi lỗi vào video và chạy tiếp video sau", async () => {
    vi.mocked(listVideosPendingAi).mockResolvedValue([video("v1", 60), video("v2", 60)]);
    vi.mocked(detectPlaceMentions).mockRejectedValueOnce(new Error("video private")).mockResolvedValueOnce([]);

    const summary = await runAiVideoHotspots();

    expect(markVideoAnalyzed).toHaveBeenCalledWith("v1", expect.objectContaining({ error: "video private" }));
    expect(summary).toMatchObject({ failedVideos: 1, analyzedVideos: 1 });
  });

  it("đang phanh publish thì mốc AI chỉ ở pending", async () => {
    vi.mocked(getPublishPauseState).mockResolvedValue({ isPaused: true, source: "breaker", reason: "acc", updatedBy: null, updatedAt: null });
    vi.mocked(listVideosPendingAi).mockResolvedValue([video("v1", 600)]);
    vi.mocked(detectPlaceMentions).mockResolvedValue([HO_TAY]);

    await runAiVideoHotspots();

    expect(insertHotspotsIgnoringDuplicates).toHaveBeenCalledWith([expect.objectContaining({ status: "pending", verifiedBy: null })]);
  });
});
