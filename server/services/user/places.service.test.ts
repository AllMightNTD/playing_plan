import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  findPlaceBySlug,
  getAllPublishedPlaces,
  getHomeCatalogPreview,
  getPublishedPlacesByIds,
  getUnswipedPublishedPlaces,
  requirePublishedPlace,
} from "./places.service";
import { isDatabaseConfigured } from "@/server/db/client";
import {
  countPublishedPlaces,
  findPublishedPlaceWithGuide,
  listMediaByPlaceIds,
  listPublishedPlacesByIds,
  listPublishedPlacesLimited,
  listPublishedPlacesWithGuides,
  listUnswipedPublishedPlacesWithGuides,
} from "@/server/db/queries/user/places.queries";
import { AppError, ERRORS } from "@/server/http/errors";
import type { Place } from "@/server/db/schema";

vi.mock("@/server/db/client", () => ({
  isDatabaseConfigured: vi.fn(),
}));

vi.mock("@/server/db/queries/user/places.queries", () => ({
  listPublishedPlacesWithGuides: vi.fn(),
  listMediaByPlaceIds: vi.fn(),
  listPublishedPlacesByIds: vi.fn(),
  findPublishedPlaceWithGuide: vi.fn(),
  countPublishedPlaces: vi.fn(),
  listPublishedPlacesLimited: vi.fn(),
  listUnswipedPublishedPlacesWithGuides: vi.fn(),
}));

function makePlaceRow(overrides: Partial<Place> = {}): Place {
  return {
    id: "db-p1",
    slug: "ca-phe-giang",
    name: "Cà Phê Giảng",
    displayName: null,
    area: "Hoàn Kiếm",
    address: "39 Nguyễn Hữu Huân, Hoàn Kiếm",
    category: "cafe",
    priceLevel: 1,
    estCostMin: 35000,
    estCostMax: 65000,
    moods: ["chill", "vintage"],
    indoor: true,
    status: "published",
    lat: "21.0335000",
    lng: "105.8542000",
    summary: "Cà phê trứng lâu đời phố cổ",
    coverUrl: null,
    tier: "A",
    batchId: null,
    dateFit: 85,
    hotScore: 80,
    fieldProvenance: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  } as Place;
}

describe("places.service - targeted TiDB query optimization & strict mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("khi DB đã cấu hình nhưng trả về 0 bản ghi, phải trả về mảng rỗng [] thay vì fallback sang mock-data", async () => {
    vi.mocked(isDatabaseConfigured).mockReturnValue(true);
    vi.mocked(listPublishedPlacesWithGuides).mockResolvedValue([]);

    const result = await getAllPublishedPlaces();
    expect(result).toEqual([]);
    expect(listPublishedPlacesWithGuides).toHaveBeenCalledTimes(1);
  });

  it("khi DB đã cấu hình nhưng câu lệnh query bị lỗi, phải ném lỗi ra ngoài thay vì nuốt lỗi", async () => {
    vi.mocked(isDatabaseConfigured).mockReturnValue(true);
    vi.mocked(listPublishedPlacesWithGuides).mockRejectedValue(new Error("TiDB connection timeout"));

    await expect(getAllPublishedPlaces()).rejects.toThrow("TiDB connection timeout");
  });

  it("findPlaceBySlug & requirePublishedPlace truy vấn điểm 1 dòng thay vì quét toàn bộ catalog", async () => {
    vi.mocked(isDatabaseConfigured).mockReturnValue(true);
    vi.mocked(findPublishedPlaceWithGuide).mockResolvedValue({
      place: makePlaceRow(),
      guide: null,
    });
    vi.mocked(listMediaByPlaceIds).mockResolvedValue([]);

    const bySlug = await findPlaceBySlug("ca-phe-giang");
    expect(bySlug?.id).toBe("db-p1");
    expect(findPublishedPlaceWithGuide).toHaveBeenCalledWith("ca-phe-giang");
    expect(listPublishedPlacesWithGuides).not.toHaveBeenCalled();

    const required = await requirePublishedPlace("db-p1");
    expect(required.slug).toBe("ca-phe-giang");
    expect(listPublishedPlacesWithGuides).not.toHaveBeenCalled();
  });

  it("chặn tuyệt đối địa điểm cấm an toàn pho-ca-phe-duong-tau ở cả findPlaceBySlug và requirePublishedPlace", async () => {
    vi.mocked(isDatabaseConfigured).mockReturnValue(true);

    expect(await findPlaceBySlug("pho-ca-phe-duong-tau")).toBeNull();
    await expect(requirePublishedPlace("pho-ca-phe-duong-tau")).rejects.toSatisfy(
      (err) => err instanceof AppError && err.definition.code === ERRORS.PLACE.NOT_FOUND.code
    );
    await expect(requirePublishedPlace("p-hidden-train")).rejects.toSatisfy(
      (err) => err instanceof AppError && err.definition.code === ERRORS.PLACE.NOT_FOUND.code
    );
    expect(findPublishedPlaceWithGuide).not.toHaveBeenCalled();
  });

  it("getPublishedPlacesByIds khử trùng lặp, short-circuit mảng rỗng và chỉ nạp media của bản ghi hợp lệ", async () => {
    vi.mocked(isDatabaseConfigured).mockReturnValue(true);

    expect(await getPublishedPlacesByIds([])).toEqual([]);
    expect(listPublishedPlacesByIds).not.toHaveBeenCalled();

    vi.mocked(listPublishedPlacesByIds).mockResolvedValue([
      { place: makePlaceRow({ id: "db-p1" }), guide: null },
    ]);
    vi.mocked(listMediaByPlaceIds).mockResolvedValue([]);

    const places = await getPublishedPlacesByIds(["db-p1", "db-p1", "unpublished-id"]);
    expect(places).toHaveLength(1);
    expect(listPublishedPlacesByIds).toHaveBeenCalledWith(["db-p1", "unpublished-id"]);
    expect(listMediaByPlaceIds).toHaveBeenCalledWith(["db-p1"]);
  });

  it("getHomeCatalogPreview dùng COUNT(*) + LIMIT thay vì tải toàn bộ bảng places", async () => {
    vi.mocked(isDatabaseConfigured).mockReturnValue(true);
    vi.mocked(countPublishedPlaces).mockResolvedValue(148);
    vi.mocked(listPublishedPlacesLimited).mockResolvedValue([
      { place: makePlaceRow({ id: "db-p1" }), guide: null },
      { place: makePlaceRow({ id: "db-p2", slug: "ho-tay" }), guide: null },
    ]);
    vi.mocked(listMediaByPlaceIds).mockResolvedValue([]);

    const preview = await getHomeCatalogPreview(3);
    expect(preview.totalPlaces).toBe(148);
    expect(preview.curatedPlaces).toHaveLength(2);
    expect(listPublishedPlacesLimited).toHaveBeenCalledWith(3);
    expect(listPublishedPlacesWithGuides).not.toHaveBeenCalled();
  });

  it("getUnswipedPublishedPlaces đẩy NOT EXISTS + LIMIT xuống SQL khi không lọc hobby", async () => {
    vi.mocked(isDatabaseConfigured).mockReturnValue(true);
    vi.mocked(listUnswipedPublishedPlacesWithGuides).mockResolvedValue([
      { place: makePlaceRow({ id: "db-p9" }), guide: null },
    ]);
    vi.mocked(listMediaByPlaceIds).mockResolvedValue([]);

    const deck = await getUnswipedPublishedPlaces(
      { roomId: "room-1", memberId: "mem-1" },
      15
    );
    expect(deck).toHaveLength(1);
    expect(listUnswipedPublishedPlacesWithGuides).toHaveBeenCalledWith("room-1", "mem-1", 15);
    expect(listPublishedPlacesWithGuides).not.toHaveBeenCalled();
  });
});
