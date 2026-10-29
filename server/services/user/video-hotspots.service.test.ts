import { beforeEach, describe, expect, it, vi } from "vitest";
import { getVideoHotspots } from "./video-hotspots.service";
import { isDatabaseConfigured } from "@/server/db/client";
import { listHotspotsByVideo } from "@/server/db/queries/videos/video-hotspots.queries";
import { HANOI_PLACES } from "@/lib/mock-data";

vi.mock("@/server/db/client", () => ({ isDatabaseConfigured: vi.fn() }));
vi.mock("@/server/db/queries/videos/video-hotspots.queries", () => ({ listHotspotsByVideo: vi.fn() }));
vi.mock("@/server/services/user/places.service", () => ({
  getAllPublishedPlaces: vi.fn(async () => HANOI_PLACES.filter((p) => p.status === "published")),
}));

const AT = new Date("2026-10-29T03:00:00.000Z");
const row = (id: string, placeId: string, timestampSec: number) => ({
  id, videoId: "yt1", placeId, timestampSec, label: null, source: "admin" as const, confidence: null, evidence: null, status: "verified" as const,
  createdBy: "a@x.vn", verifiedBy: "a@x.vn", createdAt: AT, updatedAt: AT,
  placeName: null, placeSlug: null, placeArea: null, placeStatus: null,
});

describe("getVideoHotspots", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isDatabaseConfigured).mockReturnValue(true);
  });

  it("chỉ đọc mốc đã duyệt và gắn thông tin địa điểm thật", async () => {
    vi.mocked(listHotspotsByVideo).mockResolvedValue([row("h1", "p3", 1225)]);
    const detail = await getVideoHotspots("yt1");

    expect(listHotspotsByVideo).toHaveBeenCalledWith("yt1", "verified");
    expect(detail.hotspots).toEqual([
      expect.objectContaining({ id: "h1", placeId: "p3", timestampSeconds: 1225, timeFormatted: "20:25" }),
    ]);
    expect(detail.hotspots[0].placeName).toBe(HANOI_PLACES.find((p) => p.id === "p3")!.name);
  });

  it("bỏ mốc trỏ tới địa điểm đã ẩn hoặc không còn tồn tại", async () => {
    vi.mocked(listHotspotsByVideo).mockResolvedValue([row("h2", "p-khong-ton-tai", 10)]);
    expect((await getVideoHotspots("yt1")).hotspots).toEqual([]);
  });

  it("không có DB thì trả rỗng, không tự sinh mốc", async () => {
    vi.mocked(isDatabaseConfigured).mockReturnValue(false);
    expect(await getVideoHotspots("yt1")).toEqual({ videoId: "yt1", hotspots: [] });
    expect(listHotspotsByVideo).not.toHaveBeenCalled();
  });
});
