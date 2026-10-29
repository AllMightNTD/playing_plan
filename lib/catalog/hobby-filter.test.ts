import { describe, expect, it } from "vitest";
import { matchesHobby, filterPlacesByHobby, HOBBY_TAGS } from "./hobby-filter";
import type { HanoiPlace } from "@/lib/types/catalog";

const mockPlace = (overrides: Partial<HanoiPlace> = {}): HanoiPlace => ({
  id: "test-place",
  slug: "test-place",
  name: "Quán Hẹn Hò Chill",
  area: "Hoàn Kiếm",
  category: "cafe",
  categoryLabel: "Cà phê",
  priceLevel: 2,
  costText: "50.000đ - 100.000đ",
  moods: ["chill", "romantic"],
  moodLabels: ["Lãng mạn"],
  indoor: true,
  status: "published",
  bestTimeText: "Chiều tối",
  goldenMorning: "06:00 - 08:00",
  goldenAfternoon: "16:30 - 17:45",
  blueHour: "18:00 - 18:30",
  bestWeekdays: "Thứ 6, Thứ 7",
  avoidWeekdays: "Chủ nhật",
  summary: "Không gian yên tĩnh, ấm cúng view Hồ Tây săn hoàng hôn cực đẹp",
  coverGradient: "from-amber-500 to-rose-500",
  emoji: "☕",
  media: [],
  photoSpots: [],
  poses: [],
  outfit: { palette: [], tonSurTon: "", contrast: "", avoid: "", weatherTip: "" },
  tips: "Nên đặt bàn trước",
  nearbyIds: [],
  dateFit: "romantic",
  ...overrides,
});

describe("Hobby Filter Mapping (Master Plan 5.4)", () => {
  it("should have 8 hobby tags defined", () => {
    expect(HOBBY_TAGS).toHaveLength(8);
  });

  it("should match sunset when place has sunset mood or keyword", () => {
    const p1 = mockPlace({ moods: ["sunset"] });
    expect(matchesHobby(p1, "sunset")).toBe(true);

    const p2 = mockPlace({ name: "Ngắm Hoàng Hôn Tây Hồ" });
    expect(matchesHobby(p2, "sunset")).toBe(true);

    const p3 = mockPlace({ moods: ["chill"], name: "Quán Cơm", summary: "Cơm ngon" });
    expect(matchesHobby(p3, "sunset")).toBe(false);
  });

  it("should match photo and cafe categories", () => {
    const pPhoto = mockPlace({ category: "photo" });
    expect(matchesHobby(pPhoto, "photo")).toBe(true);

    const pCafe = mockPlace({ category: "cafe" });
    expect(matchesHobby(pCafe, "cafe")).toBe(true);
  });

  it("should match indoor when indoor is true", () => {
    const pIndoor = mockPlace({ indoor: true });
    expect(matchesHobby(pIndoor, "indoor")).toBe(true);

    const pOutdoor = mockPlace({ indoor: false, category: "walk" });
    expect(matchesHobby(pOutdoor, "indoor")).toBe(false);
  });

  it("should match budget when priceLevel is 1 or cost indicates low price", () => {
    const pBudget1 = mockPlace({ priceLevel: 1 });
    expect(matchesHobby(pBudget1, "budget")).toBe(true);

    const pBudget2 = mockPlace({ priceLevel: 2, costText: "0đ (Miễn phí vé vào)" });
    expect(matchesHobby(pBudget2, "budget")).toBe(true);
  });

  it("should filter places list correctly", () => {
    const places = [
      mockPlace({ id: "p1", moods: ["sunset"], summary: "Ngắm hoàng hôn" }),
      mockPlace({ id: "p2", category: "photo", moods: [], summary: "Chụp ảnh đẹp" }),
      mockPlace({ id: "p3", category: "fun", moods: ["active"], summary: "Vui chơi" }),
    ];

    expect(filterPlacesByHobby(places, "sunset")).toHaveLength(1);
    expect(filterPlacesByHobby(places, "photo")).toHaveLength(1);
    expect(filterPlacesByHobby(places, "active")).toHaveLength(1);
    expect(filterPlacesByHobby(places, undefined)).toHaveLength(3);
  });
});
