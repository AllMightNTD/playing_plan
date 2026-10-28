import { describe, it, expect, vi } from "vitest";
import {
  getPacificTimeDateString,
  reserveQuota,
  MAX_DAILY_YOUTUBE_QUOTA,
} from "./quota-ledger";
import type { DbExecutor } from "@/server/db/client";

describe("YouTube Quota Ledger", () => {
  describe("getPacificTimeDateString", () => {
    it("should format date correctly in Pacific Time (America/Los_Angeles)", () => {
      // 06:00 UTC ngày 28/10 -> Ở LA (UTC-7 mùa hè hoặc UTC-8 mùa đông) là 23:00 hoặc 22:00 ngày 27/10
      const date1 = new Date("2026-10-28T05:00:00Z");
      const ptDate1 = getPacificTimeDateString(date1);
      expect(ptDate1).toBe("2026-10-27");

      // 18:00 UTC ngày 28/10 -> Ở LA là 11:00 ngày 28/10
      const date2 = new Date("2026-10-28T18:00:00Z");
      const ptDate2 = getPacificTimeDateString(date2);
      expect(ptDate2).toBe("2026-10-28");
    });
  });

  describe("reserveQuota", () => {
    it("should throw error if units is non-positive", async () => {
      await expect(reserveQuota(0)).rejects.toThrow("Units must be greater than 0");
      await expect(reserveQuota(-5)).rejects.toThrow("Units must be greater than 0");
    });

    it("should succeed when quota is reserved within limits", async () => {
      const mockExecutor = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
          }),
        }),
        execute: vi.fn().mockResolvedValue({ affectedRows: 1 }),
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                {
                  quotaDate: "2026-10-28",
                  unitsUsed: 20,
                  isHalted: false,
                },
              ]),
            }),
          }),
        }),
      } as unknown as DbExecutor;

      const result = await reserveQuota(20, {
        date: new Date("2026-10-28T18:00:00Z"),
        executor: mockExecutor,
      });

      expect(result.success).toBe(true);
      expect(result.unitsUsed).toBe(20);
      expect(result.isHalted).toBe(false);
    });

    it("should fail and report halted when quota cap is exceeded", async () => {
      const mockExecutor = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
          }),
        }),
        // affectedRows = 0 nghĩa là WHERE condition units_used + units <= maxQuota không thỏa mãn
        execute: vi.fn().mockResolvedValue({ affectedRows: 0 }),
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                {
                  quotaDate: "2026-10-28",
                  unitsUsed: 8000,
                  isHalted: true,
                },
              ]),
            }),
          }),
        }),
      } as unknown as DbExecutor;

      const result = await reserveQuota(10, {
        date: new Date("2026-10-28T18:00:00Z"),
        executor: mockExecutor,
      });

      expect(result.success).toBe(false);
      expect(result.isHalted).toBe(true);
      expect(result.reason).toContain("halted");
    });
  });
});
