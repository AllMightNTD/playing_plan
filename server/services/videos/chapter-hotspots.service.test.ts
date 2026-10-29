import { describe, expect, it, vi } from "vitest";
import { buildChapterHotspots } from "./chapter-hotspots.service";

vi.mock("@/server/db/queries/videos/video-hotspots.queries", () => ({ insertHotspotsIgnoringDuplicates: vi.fn() }));

const NOW = new Date("2026-10-29T03:00:00.000Z");
const PLACES = [
  { id: "vm", name: "Văn Miếu Quốc Tử Giám" },
  { id: "ht", name: "Hồ Tây" },
];

describe("buildChapterHotspots", () => {
  it("chỉ tạo mốc pending cho chapter khớp địa điểm thật", () => {
    const rows = buildChapterHotspots(
      [{ videoId: "v1", description: "0:00 Intro\n13:31 Xe Buzz 2 Tầng\n20:25 Hồ Tây\n36:01 Văn Miếu Quốc Tử Giám" }],
      PLACES,
      NOW,
      true
    );
    expect(rows).toEqual([
      expect.objectContaining({ videoId: "v1", placeId: "ht", timestampSec: 1225, status: "verified", source: "chapter" }),
      expect.objectContaining({ videoId: "v1", placeId: "vm", timestampSec: 2161, status: "verified" }),
    ]);
  });

  it("phanh publish đang bật thì mốc chỉ ở pending", () => {
    const rows = buildChapterHotspots([{ videoId: "v1", description: "0:00 Intro\n20:25 Hồ Tây" }], PLACES, NOW, false);
    expect(rows).toEqual([expect.objectContaining({ placeId: "ht", status: "pending", verifiedBy: null })]);
  });

  it("video không có chapter thì không tạo gì", () => {
    expect(buildChapterHotspots([{ videoId: "v2", description: "Review Hồ Tây cực chill" }], PLACES, NOW, true)).toEqual([]);
  });
});
