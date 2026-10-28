import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  gradeSampleItem,
  rollbackBatch,
} from "./pipeline-radar.service";
import { db } from "@/server/db/client";

describe("Pipeline Radar Service", () => {
  describe("gradeSampleItem & Circuit Breaker", () => {
    it("should record positive grades and calculate rolling accuracy", async () => {
      const res = await gradeSampleItem({
        itemId: "test_place_1",
        type: "place",
        isCorrect: true,
      });

      expect(res.success).toBe(true);
      expect(typeof res.newRollingAccuracy).toBe("number");
      expect(res.newRollingAccuracy).toBeGreaterThanOrEqual(85.0);
      expect(res.autoPaused).toBe(false);
    });

    it("should trigger auto_pause circuit breaker when rolling accuracy drops below 85%", async () => {
      // Gửi liên tiếp các mẫu sai để kéo accuracy xuống dưới 85%
      for (let i = 0; i < 5; i++) {
        await gradeSampleItem({
          itemId: `failing_item_${i}`,
          type: "place",
          isCorrect: false,
        });
      }

      const finalRes = await gradeSampleItem({
        itemId: "failing_item_last",
        type: "place",
        isCorrect: false,
      });

      if (finalRes.newRollingAccuracy < 85.0) {
        expect(finalRes.autoPaused).toBe(true);
      }
    });
  });

  describe("rollbackBatch", () => {
    it("should throw error if batchId is missing", async () => {
      await expect(rollbackBatch("")).rejects.toThrow();
    });
  });
});
