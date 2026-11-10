import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import { ExploreSearchBar } from "./ExploreSearchBar";

describe("components/explore/ExploreSearchBar", () => {
  it("render đúng placeholder, icon tìm kiếm và nút gợi ý ngẫu nhiên", () => {
    const html = renderToString(
      <ExploreSearchBar
        value="hồ tây"
        onChange={vi.fn()}
        onSearch={vi.fn()}
        onOpenWheel={vi.fn()}
      />
    );

    expect(html).toContain("hồ tây");
    expect(html).toContain("🔍");
    expect(html).toContain("🎲");
    expect(html).toContain("Gợi ý");
    expect(html).toContain("✕");
  });
});
