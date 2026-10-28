import { describe, it, expect } from "vitest";
import {
  isTrainStreetQuery,
  normalizeSearchQuery,
  filterPlaces,
  paginate,
  pickRandomPlace,
  suggestPlaces,
} from "./catalog-filter";
import { HANOI_PLACES } from "./mock-data";

describe("Catalog Filter & Search Utilities", () => {
  it("nhận diện chính xác từ khóa phố đường tàu bị cấm (Mục 14.2)", () => {
    expect(isTrainStreetQuery("phố đường tàu")).toBe(true);
    expect(isTrainStreetQuery("ca phe ray tau")).toBe(true);
    expect(isTrainStreetQuery("train street hanoi")).toBe(true);
    expect(isTrainStreetQuery("tàu hỏa")).toBe(true);
    expect(isTrainStreetQuery("hồ hoàn kiếm")).toBe(false);
  });

  it("chuẩn hóa từ khóa alias 'hồ gươm' thành 'hồ hoàn kiếm'", () => {
    expect(normalizeSearchQuery("dạo quanh hồ gươm")).toBe("dao quanh ho hoan kiem");
  });

  it("lọc địa điểm theo category và từ khóa không dấu", () => {
    const results = filterPlaces(HANOI_PLACES, {
      category: "photo",
      q: "long bien",
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results.some((p) => p.slug === "cau-long-bien")).toBe(true);
  });

  it("phân trang cursor chính xác", () => {
    const items = [1, 2, 3, 4, 5, 6, 7];
    const page1 = paginate(items, undefined, 3);
    expect(page1.items).toEqual([1, 2, 3]);
    expect(page1.nextCursor).toBe("3");

    const page2 = paginate(items, page1.nextCursor || undefined, 3);
    expect(page2.items).toEqual([4, 5, 6]);
    expect(page2.nextCursor).toBe("6");

    const page3 = paginate(items, page2.nextCursor || undefined, 3);
    expect(page3.items).toEqual([7]);
    expect(page3.nextCursor).toBeNull();
  });

  it("pickRandomPlace không lặp các slug trong excludeSlugs", () => {
    const pool = [{ slug: "a" }, { slug: "b" }, { slug: "c" }];
    const chosen = pickRandomPlace(pool, ["a", "b"], () => 0);
    expect(chosen?.slug).toBe("c");
  });

  it("suggestPlaces xếp khớp đầu tên trước khớp đầu một từ, gõ không dấu vẫn ra", () => {
    const pool = [
      { slug: "b", name: "Cà phê view Cầu Long Biên", area: "Long Biên" },
      { slug: "a", name: "Cầu Long Biên", area: "Hoàn Kiếm" },
      { slug: "c", name: "Hồ Tây", area: "Tây Hồ" },
    ];
    expect(suggestPlaces(pool, "cau", 8).map((p) => p.slug)).toEqual(["a", "b"]);
    expect(suggestPlaces(pool, "long b", 8).map((p) => p.slug)).toEqual(["b", "a"]);
    expect(suggestPlaces(pool, "zzz", 8)).toEqual([]);
  });

  it("suggestPlaces giới hạn số gợi ý", () => {
    expect(suggestPlaces(HANOI_PLACES, "c", 2)).toHaveLength(2);
  });
});
