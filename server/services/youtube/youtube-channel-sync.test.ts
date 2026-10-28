import { describe, it, expect, vi } from "vitest";
import { syncYoutubeChannels } from "@/scripts/pipeline/youtube-channel-sync";
import * as fs from "fs";

describe("YouTube Channel Sync Pipeline", () => {
  it("should process channels in dryRun mode without calling real network", async () => {
    const res = await syncYoutubeChannels({
      dryRun: true,
      maxChannels: 3,
      outputDir: "scripts/output/test_youtube",
    });

    expect(res.totalChannelsProcessed).toBe(3);
    expect(res.totalVideosIngested).toBeGreaterThanOrEqual(3);
    expect(res.videos.length).toBe(res.totalVideosIngested);

    const first = res.videos[0];
    expect(first.isEmbeddable).toBe(true);
    expect(first.privacyStatus).toBe("public");
    expect(first.hasPaidProductPlacement).toBe(false);

    // Dọn dẹp folder test
    if (fs.existsSync("scripts/output/test_youtube")) {
      fs.rmSync("scripts/output/test_youtube", { recursive: true, force: true });
    }
  });
});
