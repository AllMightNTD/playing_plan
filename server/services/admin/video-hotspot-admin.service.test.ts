import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAdminHotspot, reviewHotspot } from "./video-hotspot-admin.service";
import {
  findCatalogVideo,
  findHotspot,
  insertHotspotWithAudit,
  listHotspotsByVideo,
  updateHotspotWithAudit,
} from "@/server/db/queries/videos/video-hotspots.queries";
import { requirePublishedPlace } from "@/server/services/user/places.service";
import { AppError, ERRORS } from "@/server/http/errors";

vi.mock("@/server/db/client", () => ({ assertDatabaseConfigured: vi.fn() }));
vi.mock("@/server/db/queries/videos/video-hotspots.queries", () => ({
  findCatalogVideo: vi.fn(),
  findHotspot: vi.fn(),
  insertHotspotWithAudit: vi.fn(),
  updateHotspotWithAudit: vi.fn(),
  deleteHotspotWithAudit: vi.fn(),
  listHotspotsByVideo: vi.fn(),
  listVideosForAdmin: vi.fn(),
}));
vi.mock("@/server/services/user/places.service", () => ({ requirePublishedPlace: vi.fn() }));

const ADMIN = { email: "admin@datemate.vn" };
const AT = new Date("2026-10-29T03:00:00.000Z");
const VIDEO = { videoId: "yt1", title: "Vlog", description: null, channelTitle: "Kênh", viewCount: 10, publishedAt: AT };
const hasCode = (code: string) => (error: unknown) => error instanceof AppError && error.definition.code === code;

describe("video hotspot admin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findCatalogVideo).mockResolvedValue(VIDEO as never);
    vi.mocked(listHotspotsByVideo).mockResolvedValue([]);
    vi.mocked(requirePublishedPlace).mockResolvedValue({ id: "p3", name: "Hồ Tây" } as never);
  });

  it("ghim tay được duyệt ngay, ghi người tạo và audit", async () => {
    await createAdminHotspot(ADMIN, "yt1", { placeId: "p3", timestampSec: 1225 });
    expect(insertHotspotWithAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        videoId: "yt1", placeId: "p3", timestampSec: 1225, label: "Hồ Tây",
        source: "admin", status: "verified", createdBy: ADMIN.email, verifiedBy: ADMIN.email,
      }),
      expect.objectContaining({ adminEmail: ADMIN.email, action: "hotspot_create" })
    );
  });

  it("không ghim vào video không có trong catalog", async () => {
    vi.mocked(findCatalogVideo).mockResolvedValue(null);
    await expect(createAdminHotspot(ADMIN, "zzz", { placeId: "p3", timestampSec: 1 })).rejects.toSatisfy(
      hasCode(ERRORS.VIDEO.NOT_FOUND.code)
    );
  });

  it("trùng (video, địa điểm, giây) trả 409 thay vì lỗi 500", async () => {
    vi.mocked(insertHotspotWithAudit).mockRejectedValue(new Error("Duplicate entry 'yt1-p3-1225'"));
    await expect(createAdminHotspot(ADMIN, "yt1", { placeId: "p3", timestampSec: 1225 })).rejects.toSatisfy(
      hasCode(ERRORS.VIDEO.HOTSPOT_DUPLICATE.code)
    );
  });

  it("duyệt mốc chapter ghi người duyệt và trạng thái cũ vào audit", async () => {
    vi.mocked(findHotspot).mockResolvedValue({ id: "h1", status: "pending", placeId: "p3", timestampSec: 1225 } as never);
    await reviewHotspot(ADMIN, "yt1", "h1", { status: "verified" });
    expect(updateHotspotWithAudit).toHaveBeenCalledWith(
      "h1",
      expect.objectContaining({ status: "verified", verifiedBy: ADMIN.email }),
      expect.objectContaining({ action: "hotspot_verify", changes: expect.objectContaining({ before: expect.objectContaining({ status: "pending" }) }) })
    );
  });

  it("mốc không thuộc video thì 404", async () => {
    vi.mocked(findHotspot).mockResolvedValue(null);
    await expect(reviewHotspot(ADMIN, "yt1", "h-khac", { status: "rejected" })).rejects.toSatisfy(
      hasCode(ERRORS.VIDEO.HOTSPOT_NOT_FOUND.code)
    );
  });
});
