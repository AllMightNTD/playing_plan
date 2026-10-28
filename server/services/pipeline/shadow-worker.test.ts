import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  classifyDateFit,
  evaluateCandidateTier,
  runShadowWorker,
} from "./shadow-worker";
import * as quotaLedger from "@/server/services/youtube/quota-ledger";
import type { DbExecutor } from "@/server/db/client";

vi.mock("@/server/services/youtube/quota-ledger", async (importOriginal) => {
  const actual = await importOriginal<typeof quotaLedger>();
  return {
    ...actual,
    getQuotaStatus: vi.fn(),
  };
});

describe("Shadow Worker Logic & Policy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("classifyDateFit", () => {
    it("should classify casual for street food, nướng, lẩu", () => {
      expect(classifyDateFit("Lẩu Bò Nhúng Dấm")).toBe("casual");
      expect(classifyDateFit("Quán Nướng Bình Dân")).toBe("casual");
      expect(classifyDateFit("Phở Gia Truyền Bát Đàn")).toBe("casual");
    });

    it("should classify romantic for rooftop, fine dining, cocktail bar", () => {
      expect(classifyDateFit("The Rooftop Bar Hanoi")).toBe("romantic");
      expect(classifyDateFit("Nhà Hàng Khuê")).toBe("romantic");
      expect(classifyDateFit("Wine Lounge & Steak")).toBe("romantic");
    });

    it("should classify chill for garden, lakeside, coffee shops", () => {
      expect(classifyDateFit("Garden Coffee & Tea", { outdoor_seating: "yes" })).toBe("chill");
      expect(classifyDateFit("Cà phê ểnh ương")).toBe("chill");
      expect(classifyDateFit("Tranquil Books & Coffee")).toBe("chill");
    });
  });

  describe("evaluateCandidateTier", () => {
    it("should classify Tier A when score >= 70 and has verified contact or hours", () => {
      expect(
        evaluateCandidateTier(75, { phone: "0912345678", opening_hours: "08:00-22:00" })
      ).toBe("A");
      expect(
        evaluateCandidateTier(80, { website: "https://example.com" })
      ).toBe("A");
    });

    it("should downgrade to Tier B or C if high score but lacking contact/hours", () => {
      // Đạt 70 điểm nhưng không có phone/website/opening_hours
      expect(evaluateCandidateTier(70, {})).toBe("B");
    });

    it("should classify Tier B when score >= 55", () => {
      expect(evaluateCandidateTier(60, {})).toBe("B");
      expect(evaluateCandidateTier(55, {})).toBe("B");
    });

    it("should classify Tier C when score < 55", () => {
      expect(evaluateCandidateTier(50, {})).toBe("C");
      expect(evaluateCandidateTier(40, {})).toBe("C");
    });
  });

  describe("Quota Breaker Behavior", () => {
    it("should pause execution when quota is halted or exceeds max quota", async () => {
      vi.mocked(quotaLedger.getQuotaStatus).mockResolvedValueOnce({
        quotaDate: "2026-10-28",
        unitsUsed: 8050,
        remaining: 0,
        isHalted: true,
      });

      const mockExecutor = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockResolvedValue(undefined),
        }),
      } as unknown as DbExecutor;

      const result = await runShadowWorker({ executor: mockExecutor });
      expect(result.status).toBe("paused");
      expect(result.quotaUsed).toBe(8050);
      expect(result.totalEvaluated).toBe(0);
      expect(result.reason).toContain("Hạn mức YouTube API");
    });
  });
});
