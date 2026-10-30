import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAllPublishedPlaces } from "./places.service";
import { isDatabaseConfigured } from "@/server/db/client";
import { listPublishedPlacesWithGuides } from "@/server/db/queries/user/places.queries";

vi.mock("@/server/db/client", () => ({
  isDatabaseConfigured: vi.fn(),
}));

vi.mock("@/server/db/queries/user/places.queries", () => ({
  listPublishedPlacesWithGuides: vi.fn(),
  listMediaByPlaceIds: vi.fn(),
}));

describe("places.service - getAllPublishedPlaces strict mode", () => {
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
});
