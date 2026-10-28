import { describe, it, expect } from "vitest";
import { buildPlaceSearchFields, toSlug } from "./search";

describe("toSlug", () => {
  it("should strip Vietnamese accents and punctuation", () => {
    expect(toSlug("Cầu Long Biên")).toBe("cau-long-bien");
    expect(toSlug("  Phố đi bộ Hồ Gươm (cuối tuần)! ")).toBe("pho-di-bo-ho-guom-cuoi-tuan");
    expect(toSlug("cafe_view__đẹp")).toBe("cafe-view-dep");
  });
});

describe("buildPlaceSearchFields", () => {
  it("should index name twice plus labels, tags and summary without accents", () => {
    const fields = buildPlaceSearchFields({
      name: "Hồ Tây",
      area: "Tây Hồ",
      category: "walk",
      moods: ["romantic"],
      tags: ["hoàng hôn"],
      summary: "Đạp vịt",
    });
    expect(fields.searchName).toBe("ho tay");
    expect(fields.searchText).toBe("ho tay ho tay tay ho dao bo lang man hoang hon dap vit");
  });
});
