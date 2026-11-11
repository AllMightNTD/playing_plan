import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import { MAIN_NAV, isNavActive } from "./ScrapbookNavbar";
import { BottomNav } from "./BottomNav";

vi.mock("next/navigation", () => ({
  usePathname: () => "/explore",
}));

describe("components/user/BottomNav & navigation helpers", () => {
  it("matches active routes accurately across all 4 core sections", () => {
    expect(isNavActive("/", MAIN_NAV[0].match)).toBe(true);
    expect(isNavActive("/plans", MAIN_NAV[0].match)).toBe(true);
    expect(isNavActive("/explore", MAIN_NAV[0].match)).toBe(false);

    expect(isNavActive("/explore", MAIN_NAV[1].match)).toBe(true);
    expect(isNavActive("/places/ho-tay", MAIN_NAV[1].match)).toBe(true);
    expect(isNavActive("/videos", MAIN_NAV[1].match)).toBe(true);

    expect(isNavActive("/match", MAIN_NAV[2].match)).toBe(true);
    expect(isNavActive("/memories", MAIN_NAV[3].match)).toBe(true);
  });

  it("renders exactly 4 primary navigation destinations without duplicate search button", () => {
    const html = renderToString(<BottomNav />);

    expect(html).toContain("Kế hoạch");
    expect(html).toContain("Khám phá");
    expect(html).toContain("Hợp Gu");
    expect(html).toContain("Kỷ niệm");
    expect(html).not.toContain("Tìm quán");
    expect(html).toContain("min-h-11");
  });
});

