import { describe, expect, it } from "vitest";
import {
  getVideoHotspots,
  listFeaturedVideosWithHotspots,
  CURATED_FEATURED_VIDEOS,
} from "./video-hotspots.service";

describe("Video Hotspots & Pin Tags Service (Phase 3)", () => {
  it("should list 3 curated featured videos with pinCount", async () => {
    const list = await listFeaturedVideosWithHotspots();
    expect(list).toHaveLength(3);
    expect(list[0]).toHaveProperty("pinCount");
    expect(list[0].pinCount).toBeGreaterThan(0);
    expect(list[0]).toHaveProperty("primaryPlaceName");
  });

  it("should get hotspots detail for a curated video", async () => {
    const detail = await getVideoHotspots("vid-long-bien");
    expect(detail.videoId).toBe("vid-long-bien");
    expect(detail.hotspots.length).toBeGreaterThan(0);
    expect(detail.hotspots[0]).toMatchObject({
      id: "spot-1",
      timestampSeconds: 42,
      timeFormatted: "00:42",
      position: { x: expect.any(Number), y: expect.any(Number) },
    });
    expect(Array.isArray(detail.nearbyPlaces)).toBe(true);
  });

  it("should reject getting hotspots for an unknown video", async () => {
    await expect(getVideoHotspots("unknown-non-existent-video")).rejects.toThrow();
  });
});
