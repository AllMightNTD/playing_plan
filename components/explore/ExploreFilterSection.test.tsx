import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import { ExploreFilterSection } from "./ExploreFilterSection";
import { EXPLORE_CATEGORIES, EXPLORE_MOODS } from "@/lib/constants/catalog";

describe("components/explore/ExploreFilterSection", () => {
  it("render đầy đủ 2 tầng phân loại (Thể loại địa điểm và Gu hẹn hò)", () => {
    const html = renderToString(
      <ExploreFilterSection
        category="cafe"
        onSelectCategory={vi.fn()}
        mood="romantic"
        onSelectMood={vi.fn()}
        district="all"
        onSelectDistrict={vi.fn()}
        budget="all"
        onSelectBudget={vi.fn()}
        sortBy="default"
        onSelectSortBy={vi.fn()}
        userLocationAvailable={false}
        totalCount={120}
        displayedCount={24}
        onResetFilters={vi.fn()}
      />
    );

    // Kiểm tra render các categories
    for (const cat of EXPLORE_CATEGORIES) {
      const expectedLabel = cat.label.replace(/&/g, "&amp;");
      expect(html).toContain(expectedLabel);
    }

    // Kiểm tra render các moods
    for (const mood of EXPLORE_MOODS) {
      expect(html).toContain(mood.label);
    }

    // Kiểm tra số lượng thống kê
    expect(html).toContain("24");
    expect(html).toContain("120");
    expect(html).toContain("Đặt lại tất cả bộ lọc");
  });
});
