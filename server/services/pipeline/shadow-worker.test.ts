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

  describe("Executor Isolation & Admin Verdict Immunity", () => {
    it("routes all queries through options.executor and excludes verified/rejected rows in SQL updates", async () => {
      vi.mocked(quotaLedger.getQuotaStatus).mockResolvedValueOnce({
        quotaDate: "2026-11-02",
        unitsUsed: 600,
        remaining: 7400,
        isHalted: false,
      });

      const executedSqlChunks: string[] = [];
      let selectCall = 0;

      const mockExecutor = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockResolvedValue(undefined),
        }),
        select: vi.fn().mockImplementation(() => ({
          from: vi.fn().mockImplementation(() => {
            selectCall += 1;
            if (selectCall === 1) return Promise.resolve([]); // placeBlocklist
            if (selectCall === 2) {
              return {
                where: vi.fn().mockResolvedValue([]), // candidatePlaces
              };
            }
            return Promise.resolve([{ autoLinked: 2, pendingReview: 1 }]); // videoStats
          }),
        })),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined),
          }),
        }),
        execute: vi.fn().mockImplementation(async (queryObj: unknown) => {
          executedSqlChunks.push(JSON.stringify(queryObj));
        }),
      } as unknown as DbExecutor;

      const res = await runShadowWorker({ batchId: "batch_unit", executor: mockExecutor });

      expect(res.status).toBe("success");
      expect(executedSqlChunks).toHaveLength(3);
      for (const rawSql of executedSqlChunks) {
        expect(rawSql).toContain("verified");
        expect(rawSql).toContain("rejected");
      }
    });
  });
});
