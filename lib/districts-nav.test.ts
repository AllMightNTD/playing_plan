import { describe, it, expect } from "vitest";
import { getExploreDistrictUrl } from "./districts-nav";

describe("getExploreDistrictUrl", () => {
  it("sinh URL đúng định dạng để Explore page tự kích hoạt filter quận", () => {
    expect(getExploreDistrictUrl("hoan-kiem")).toBe("/explore?district=hoan-kiem");
    expect(getExploreDistrictUrl("tay-ho")).toBe("/explore?district=tay-ho");
  });
});
