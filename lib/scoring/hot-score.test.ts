import { describe, it, expect } from "vitest";
import {
  calculateHotScore,
  calculateVideoHotness,
  calculateAppEngagement,
} from "./hot-score";

describe("HotScore Algorithm", () => {
  it("should calculate max VideoHotness (100) for brand new video with >= 1M views", () => {
    const now = new Date("2026-10-28T12:00:00Z");
    const pubDate = new Date("2026-10-28T12:00:00Z");

    const res = calculateVideoHotness(1_500_000, pubDate, now);
    expect(res.decayFactor).toBeCloseTo(1.0, 2);
    expect(res.videoHotness).toBe(100);
  });

  it("should decay VideoHotness by roughly 50% after 180 days (half-life)", () => {
    const now = new Date("2026-10-28T12:00:00Z");
    const pubDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000); // 180 ngày trước

    const res = calculateVideoHotness(1_000_000, pubDate, now);
    expect(res.daysOld).toBe(180);
    expect(res.decayFactor).toBeCloseTo(0.5, 2);
    expect(res.videoHotness).toBeCloseTo(50, 1);
  });

  it("should calculate AppEngagement independently of video age", () => {
    expect(calculateAppEngagement(250)).toBe(50); // 250 / 500 = 50%
    expect(calculateAppEngagement(500)).toBe(100);
    expect(calculateAppEngagement(1000)).toBe(100); // Capped at 100
  });

  it("should combine VideoHotness and AppEngagement into final HotScore [0, 100]", () => {
    const now = new Date("2026-10-28T12:00:00Z");
    // Video mới 500k views (50 điểm) + App likes 500 (100 điểm)
    // HotScore = 0.5 * 50 + 0.5 * 100 = 75
    const res = calculateHotScore({
      videoViews: 500_000,
      videoPublishedAt: now,
      appLikes: 500,
      now,
    });

    expect(res.videoHotness).toBe(50);
    expect(res.appEngagement).toBe(100);
    expect(res.hotScore).toBe(75);
  });
});
