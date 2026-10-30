import { describe, it, expect } from "vitest";
import {
  timeToMinutes,
  minutesToTime,
  calculateDistanceKm,
  calculateTravelMinutes,
  formatVietnameseDate,
  computePlanTimeline,
  computeItineraryStats,
  optimizeItinerarySequence,
} from "./plan-optimizer";

describe("lib/plan-optimizer", () => {
  describe("timeToMinutes & minutesToTime", () => {
    it("converts standard time string to minutes and back", () => {
      expect(timeToMinutes("15:00")).toBe(900);
      expect(minutesToTime(900)).toBe("15:00");
      expect(timeToMinutes("00:00")).toBe(0);
      expect(minutesToTime(0)).toBe("00:00");
      expect(timeToMinutes("16:23")).toBe(983);
      expect(minutesToTime(983)).toBe("16:23");
    });

    it("handles fallback and normalization", () => {
      expect(timeToMinutes(null)).toBe(900);
      expect(timeToMinutes("")).toBe(900);
      // Minutes > 1440 or negative normalize safely
      expect(minutesToTime(1440)).toBe("00:00");
      expect(minutesToTime(-60)).toBe("23:00");
    });
  });

  describe("calculateDistanceKm & calculateTravelMinutes", () => {
    it("returns 0 for missing stops", () => {
      expect(calculateDistanceKm(null, null)).toBe(0);
      expect(calculateDistanceKm({ lat: 21.0 }, null)).toBe(0);
      expect(calculateDistanceKm(null, { lat: 21.0 })).toBe(0);
    });

    it("calculates realistic road distance in Hanoi with 1.35 factor", () => {
      // 420 Lab (Ba Dinh) to Bun Cha (Hoan Kiem)
      const stopA = { lat: 21.0312, lng: 105.8395 };
      const stopB = { lat: 21.0338, lng: 105.8482 };
      const dist = calculateDistanceKm(stopA, stopB);
      expect(dist).toBeGreaterThanOrEqual(0.6);
      expect(dist).toBeLessThan(5.0);
    });

    it("calculates travel minutes including parking buffer", () => {
      expect(calculateTravelMinutes(0)).toBe(10);
      expect(calculateTravelMinutes(1.5)).toBeGreaterThanOrEqual(10);
      // Ensure rounded to nearest 5 minutes
      expect(calculateTravelMinutes(3.0) % 5).toBe(0);
    });
  });

  describe("formatVietnameseDate", () => {
    it("formats ISO date string into day of week and date", () => {
      // 2026-11-01 is a Sunday (CN)
      const formatted = formatVietnameseDate("2026-11-01");
      expect(formatted).toContain("CN");
      expect(formatted).toContain("01/11");
    });

    it("provides fallback for invalid or empty dates", () => {
      expect(formatVietnameseDate("")).toBe("CN, 01/11");
      expect(formatVietnameseDate("invalid-date")).toBe("CN, 01/11");
    });
  });

  describe("computePlanTimeline", () => {
    it("computes timeline correctly for chained stops", () => {
      const stops = [
        {
          id: "stop-1",
          name: "420 Lab",
          duration: 60,
          lat: 21.0312,
          lng: 105.8395,
          isLocked: false,
          lockedStartTime: null,
        },
        {
          id: "stop-2",
          name: "Bảo Tàng Mỹ Thuật",
          duration: 75,
          lat: 21.0305,
          lng: 105.8372,
          isLocked: false,
          lockedStartTime: null,
        },
      ];

      const timeline = computePlanTimeline(stops, "15:00");
      expect(timeline).toHaveLength(2);

      // Stop 1
      expect(timeline[0].startTimeStr).toBe("15:00");
      expect(timeline[0].endTimeStr).toBe("16:00");
      expect(timeline[0].distKm).toBe(0);
      expect(timeline[0].travelMins).toBe(0);

      // Stop 2 starts after stop 1 end + travel time
      expect(timeline[1].startMin).toBe(timeline[0].endMin + timeline[1].travelMins);
      expect(timeline[1].endTimeStr).toBe(minutesToTime(timeline[1].startMin + 75));
    });

    it("detects time conflict when locked time is earlier than arrival", () => {
      const stops = [
        {
          id: "stop-1",
          name: "Quán 1",
          duration: 60,
          lat: 21.0312,
          lng: 105.8395,
          isLocked: false,
          lockedStartTime: null,
        },
        {
          id: "stop-2",
          name: "Quán 2",
          duration: 60,
          lat: 21.0305,
          lng: 105.8372,
          isLocked: true,
          lockedStartTime: "15:30", // Conflict: stop 1 finishes at 16:00
        },
      ];

      const timeline = computePlanTimeline(stops, "15:00");
      expect(timeline[1].timeConflictWarning).toBeTruthy();
      expect(timeline[1].timeConflictWarning).toContain("Giờ cố định (15:30)");
    });

    it("identifies stops overlapping golden hour", () => {
      const stops = [
        {
          id: "stop-sunset",
          name: "Ngắm hoàng hôn Hồ Tây",
          duration: 60,
          isLocked: true,
          lockedStartTime: "16:20",
        },
      ];

      const timeline = computePlanTimeline(stops, "15:00");
      expect(timeline[0].overlapsGoldenHour).toBe(true);
    });
  });

  describe("computeItineraryStats", () => {
    it("handles empty timeline", () => {
      const stats = computeItineraryStats([]);
      expect(stats.totalKm).toBe("0.0");
      expect(stats.totalDurationStr).toBe("0 giờ");
      expect(stats.startStr).toBe("--:--");
      expect(stats.endStr).toBe("--:--");
    });

    it("aggregates distance and duration for non-empty timeline", () => {
      const stops = [
        { id: "1", duration: 60, lat: 21.0312, lng: 105.8395 },
        { id: "2", duration: 60, lat: 21.0338, lng: 105.8482 },
      ];
      const timeline = computePlanTimeline(stops, "15:00");
      const stats = computeItineraryStats(timeline);

      expect(Number(stats.totalKm)).toBeGreaterThan(0);
      expect(stats.startStr).toBe("15:00");
      expect(stats.totalDurationStr).toMatch(/\d+h|\d+p/);
    });
  });

  describe("optimizeItinerarySequence", () => {
    it("orders stops logically: coffee -> activity/sunset -> food -> closing coffee", () => {
      const unorderedStops = [
        { id: "s-food", category: "food", name: "Bún chả" },
        { id: "s-coffee-2", category: "coffee", name: "Cafe đêm" },
        { id: "s-sunset", category: "sunset", name: "Hồ Tây" },
        { id: "s-coffee-1", category: "coffee", name: "Cafe chiều" },
      ];

      const result = optimizeItinerarySequence(unorderedStops);
      expect(result.recommendedStartTime).toBe("15:00");
      expect(result.stops[0].id).toBe("s-coffee-1");
      expect(result.stops[1].id).toBe("s-sunset");
      expect(result.stops[2].id).toBe("s-food");
      expect(result.stops[3].id).toBe("s-coffee-2");
      // Stop 1 (sunset/activity) should be locked to golden hour
      expect(result.stops[1].isLocked).toBe(true);
      expect(result.stops[1].lockedStartTime).toBe("16:15");
    });
  });
});
