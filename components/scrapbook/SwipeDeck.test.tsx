import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import { SwipeDeck } from "./SwipeDeck";
import type { HanoiPlace } from "@/lib/types/catalog";

const BASE_OUTFIT = {
  palette: ["#F7F1E5"],
  tonSurTon: "Sơ mi kem",
  contrast: "Trắng tinh khôi",
  avoid: "Giày cao gót",
  weatherTip: "Mát mẻ",
};

const MOCK_DECK: HanoiPlace[] = [
  {
    id: "place-1",
    slug: "ban-cong-cafe",
    name: "Ban Công Cafe",
    category: "cafe",
    categoryLabel: "Quán Cà Phê",
    priceLevel: 2,
    status: "published",
    area: "Hoàn Kiếm",
    address: "Số 2 Đinh Liệt, Hoàn Kiếm, Hà Nội",
    summary: "Biệt thự Pháp cổ lãng mạn giữa lòng phố cổ Hà Nội.",
    costText: "60k - 120k",
    goldenMorning: "08:00 - 10:00",
    goldenAfternoon: "16:30 - 18:00",
    blueHour: "18:00 - 18:30",
    bestWeekdays: "T2 - T5",
    avoidWeekdays: "Tối T7",
    emoji: "☕",
    coverUrl: "https://images.unsplash.com/photo-1",
    coverGradient: "from-amber-400 to-rose-400",
    bestTimeText: "Chiều hoàng hôn",
    indoor: true,
    moods: ["romantic", "photo"],
    moodLabels: ["Lãng mạn", "Chụp ảnh đẹp"],
    lat: 21.033,
    lng: 105.852,
    media: [],
    photoSpots: [],
    poses: [],
    outfit: BASE_OUTFIT,
    tips: "",
    nearbyIds: [],
  },
  {
    id: "place-2",
    slug: "ho-tay-sunset",
    name: "Đường Thanh Niên Hồ Tây",
    category: "photo",
    categoryLabel: "Góc Ngắm Cảnh",
    priceLevel: 1,
    status: "published",
    area: "Tây Hồ",
    address: "Đường Thanh Niên, Tây Hồ, Hà Nội",
    summary: "Cung đường ngắm hoàng hôn đẹp nhất Hà Nội.",
    costText: "Miễn phí",
    goldenMorning: "06:30 - 08:00",
    goldenAfternoon: "17:00 - 18:15",
    blueHour: "18:15 - 18:45",
    bestWeekdays: "Mọi ngày",
    avoidWeekdays: "Chiều CN",
    emoji: "🌅",
    coverGradient: "from-orange-400 to-rose-500",
    bestTimeText: "17:00 - 18:15",
    indoor: false,
    moods: ["romantic"],
    moodLabels: ["Lãng mạn"],
    lat: 21.048,
    lng: 105.839,
    media: [],
    photoSpots: [],
    poses: [],
    outfit: BASE_OUTFIT,
    tips: "",
    nearbyIds: [],
  },
];

describe("components/scrapbook/SwipeDeck", () => {
  it("renders draggable polaroid card, swipe stamps, detail trigger, and 44px action buttons", () => {
    const html = renderToString(
      <SwipeDeck
        initialDeck={MOCK_DECK}
        isPaired={true}
        onOpenDetail={vi.fn()}
        onAddToPlan={vi.fn()}
      />
    );

    expect(html).toContain("Ban Công Cafe");
    expect(html).toContain("Hoàn Kiếm");
    expect(html).toContain("THÍCH QUÁN NÀY");
    expect(html).toContain("ĐỔI QUÁN");
    expect(html).toContain("Xem cẩm nang");
    expect(html).toContain("Đổi quán khác");
    expect(html).toContain("Thích quán này!");
    expect(html).toContain("min-h-11");
  });

  it("renders unpaired hint banner when couple room is not yet paired", () => {
    const html = renderToString(
      <SwipeDeck
        initialDeck={MOCK_DECK}
        isPaired={false}
      />
    );

    expect(html).toContain("Bạn đang quẹt một mình");
  });
});
