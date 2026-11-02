import { describe, expect, it, vi } from "vitest";
import * as gateway from "./gemini-gateway";
import {
  DEFAULT_VIDEO_AI_MODEL,
  VideoAiQuotaError,
  detectPlaceMentions,
  namesAgree,
  validateMentions,
  type AiPlaceMention,
} from "./video-hotspot-ai.service";

const CANDIDATES = [
  { id: "vm", name: "Văn Miếu Quốc Tử Giám", area: "Đống Đa" },
  { id: "ht", name: "Hồ Tây", area: "Tây Hồ" },
];

const mention = (patch: Partial<AiPlaceMention>): AiPlaceMention => ({
  placeId: "vm",
  nameInVideo: "Văn Miếu Quốc Tử Giám",
  timestampSec: 120,
  evidence: "on_screen_text",
  quote: "VĂN MIẾU - QUỐC TỬ GIÁM",
  confidence: 0.95,
  ...patch,
});

describe("namesAgree", () => {
  it("chấp nhận cách gọi không dấu, rút gọn hoặc kèm chữ thừa", () => {
    expect(namesAgree("van mieu quoc tu giam", "Văn Miếu Quốc Tử Giám")).toBe(true);
    expect(namesAgree("đi dạo Hồ Tây buổi chiều", "Hồ Tây")).toBe(true);
    expect(namesAgree("Văn Miếu", "Văn Miếu Quốc Tử Giám")).toBe(true);
  });

  it("từ chối khi tên khác hẳn (AI gán nhầm placeId)", () => {
    expect(namesAgree("Hồ Gươm", "Hồ Tây")).toBe(false);
    expect(namesAgree("Lăng Bác", "Văn Miếu Quốc Tử Giám")).toBe(false);
  });
});

describe("validateMentions", () => {
  it("tự duyệt mốc tin cậy cao, tên khớp; mốc kém chắc chắn để pending", () => {
    const result = validateMentions(
      [mention({}), mention({ placeId: "ht", nameInVideo: "Hồ Tây", timestampSec: 300, confidence: 0.6 })],
      CANDIDATES,
      600,
      true
    );
    expect(result).toEqual([
      expect.objectContaining({ placeId: "vm", timestampSec: 120, autoVerify: true, evidence: "on_screen_text: VĂN MIẾU - QUỐC TỬ GIÁM" }),
      expect.objectContaining({ placeId: "ht", timestampSec: 300, autoVerify: false }),
    ]);
  });

  it("bỏ placeId bịa, giây vượt độ dài video, thiếu bằng chứng", () => {
    const result = validateMentions(
      [
        mention({ placeId: "khong-co" }),
        mention({ placeId: null }),
        mention({ timestampSec: 900 }),
        mention({ timestampSec: -5 }),
        mention({ quote: "  " }),
      ],
      CANDIDATES,
      600,
      true
    );
    expect(result).toEqual([]);
  });

  it("tên AI nghe thấy không khớp placeId thì không tự duyệt dù confidence cao", () => {
    const [m] = validateMentions([mention({ placeId: "ht", nameInVideo: "Hồ Gươm" })], CANDIDATES, 600, true);
    expect(m.autoVerify).toBe(false);
  });

  it("gộp các lần nhắc cùng địa điểm trong 60 giây, giữ lần đầu", () => {
    const result = validateMentions(
      [mention({ timestampSec: 150 }), mention({ timestampSec: 120 }), mention({ timestampSec: 400 })],
      CANDIDATES,
      600,
      true
    );
    expect(result.map((m) => m.timestampSec)).toEqual([120, 400]);
  });

  it("đang phanh publish thì không tự duyệt gì", () => {
    expect(validateMentions([mention({})], CANDIDATES, 600, false)[0].autoVerify).toBe(false);
  });
});

describe("detectPlaceMentions", () => {
  it("delegates to generateStructuredJson with gemini-3.8-flash low-resolution video input and maps transient failures to VideoAiQuotaError", async () => {
    expect(DEFAULT_VIDEO_AI_MODEL).toBe("gemini-3.8-flash");
    const spy = vi
      .spyOn(gateway, "generateStructuredJson")
      .mockResolvedValueOnce({ mentions: [mention({})] })
      .mockRejectedValueOnce(new gateway.GeminiTimeoutError(15_000));

    const mentions = await detectPlaceMentions({
      apiKey: "real-video-key",
      model: "",
      videoId: "yt_123",
      videoTitle: "Review Hồ Tây",
      candidates: CANDIDATES,
    });
    expect(mentions).toHaveLength(1);
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gemini-3.8-flash",
        input: expect.arrayContaining([
          expect.objectContaining({
            type: "video",
            uri: "https://www.youtube.com/watch?v=yt_123",
            resolution: "low",
          }),
        ]),
      })
    );

    await expect(
      detectPlaceMentions({
        apiKey: "real-video-key",
        model: "gemini-3.8-flash",
        videoId: "yt_timeout",
        videoTitle: "Timeout Video",
        candidates: CANDIDATES,
      })
    ).rejects.toBeInstanceOf(VideoAiQuotaError);

    spy.mockRestore();
  });
});
