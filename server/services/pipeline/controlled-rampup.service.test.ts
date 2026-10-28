import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getDailyPublishLimit,
} from "./controlled-rampup.service";
import * as governancePolicy from "@/server/services/admin/governance.policy";
import { AppError, ERRORS } from "@/server/http/errors";

describe("Controlled Ramp-up & Circuit Breakers", () => {
  describe("getDailyPublishLimit", () => {
    it("should return correct staged limits", () => {
      expect(getDailyPublishLimit(1)).toBe(10);
      expect(getDailyPublishLimit(2)).toBe(20);
      expect(getDailyPublishLimit(3)).toBe(50);
    });
  });

  describe("Kill Switch & Circuit Breaker Immunity", () => {
    it("should throw error when EMERGENCY_HALT_PUBLISH is true", () => {
      const originalEnv = process.env.EMERGENCY_HALT_PUBLISH;
      try {
        process.env.EMERGENCY_HALT_PUBLISH = "true";
        expect(() => governancePolicy.assertPublishNotHalted()).toThrowError(
          AppError
        );
      } finally {
        process.env.EMERGENCY_HALT_PUBLISH = originalEnv;
      }
    });

    it("should block railway safety pattern via isCandidateBlocklisted", () => {
      const isBlocked = governancePolicy.isCandidateBlocklisted(
        {
          name: "Cafe Phố Đường Tàu Hà Nội",
          lat: 21.0285,
          lng: 105.8542,
        },
        [
          {
            id: "blk_1",
            osmId: null,
            namePattern: "đường tàu",
            latMin: null,
            latMax: null,
            lngMin: null,
            lngMax: null,
            reason: "railway_safety",
            note: null,
            createdAt: new Date(),
          },
        ]
      );
      expect(isBlocked).toBe(true);
    });
  });
});
