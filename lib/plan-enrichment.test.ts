import { describe, it, expect } from "vitest";
import {
  getPlaceCategoryMeta,
  enrichPlanStops,
  matchCatalogPlaceByName,
  DATING_TEMPLATES,
} from "./plan-enrichment";
import type { PlanStopDto } from "@/server/services/user/plan.mapper";
import type { HanoiPlace } from "@/lib/types/catalog";

describe("lib/plan-enrichment", () => {
  describe("getPlaceCategoryMeta", () => {
    it("returns correct metadata for all 7 standard database categories", () => {
      expect(getPlaceCategoryMeta("cafe")).toEqual({
        category: "cafe",
        icon: "☕",
        label: "Cà phê",
      });
      expect(getPlaceCategoryMeta("food")).toEqual({
        category: "food",
        icon: "🍜",
        label: "Ăn uống",
      });
      expect(getPlaceCategoryMeta("photo")).toEqual({
        category: "photo",
        icon: "📸",
        label: "Chụp ảnh / Check-in",
      });
      expect(getPlaceCategoryMeta("walk")).toEqual({
        category: "walk",
        icon: "🚶",
        label: "Dạo phố",
      });
      expect(getPlaceCategoryMeta("fun")).toEqual({
        category: "fun",
        icon: "🎡",
        label: "Vui chơi / Giải trí",
      });
      expect(getPlaceCategoryMeta("indoor")).toEqual({
        category: "indoor",
        icon: "🏛️",
        label: "Trong nhà",
      });
      expect(getPlaceCategoryMeta("nature")).toEqual({
        category: "nature",
        icon: "🌿",
        label: "Thiên nhiên / Công viên",
      });
    });

    it("maps legacy aliases to normalized categories", () => {
      expect(getPlaceCategoryMeta("coffee").icon).toBe("☕");
      expect(getPlaceCategoryMeta("activity").icon).toBe("📸");
      expect(getPlaceCategoryMeta("sunset").icon).toBe("🌅");
    });

    it("falls back gracefully for unknown or null category", () => {
      const fallback = getPlaceCategoryMeta(undefined);
      expect(fallback.icon).toBe("📍");
      expect(fallback.label).toBe("Địa điểm hẹn hò");
    });
  });

  describe("enrichPlanStops", () => {
    const mockPlaces: HanoiPlace[] = [
      {
        id: "p1",
        slug: "la-viet-coffee-dong-da",
        name: "Là Việt Coffee",
        category: "cafe",
        area: "Đống Đa",
        address: "Ngõ 100 Tây Sơn, Đống Đa, Hà Nội",
        lat: 21.0125,
        lng: 105.8265,
        indoor: true,
        coverUrl: "https://images.unsplash.com/photo-la-viet",
      } as unknown as HanoiPlace,
      {
        id: "p2",
        slug: "ho-tay-tu-hoa",
        name: "Hồ Tây - Đoạn Phố Từ Hoa",
        category: "photo",
        area: "Tây Hồ",
        address: "Phố Từ Hoa, Tây Hồ, Hà Nội",
        lat: 21.0585,
        lng: 105.8295,
        indoor: false,
        coverUrl: "https://images.unsplash.com/photo-ho-tay",
      } as unknown as HanoiPlace,
    ];

    it("enriches stop linked to catalog place with full metadata, cover, coordinates, and slug", () => {
      const stops: PlanStopDto[] = [
        {
          id: "stop-1",
          placeId: "p1",
          customName: null,
          sortOrder: 0,
          plannedTime: "15:00",
          durationMin: 60,
          dayOffset: 0,
          startMinute: 900,
          travelMinutes: 0,
          isPinnedTime: true,
          note: "Thử dòng Coldbrew cam sả",
        },
      ];

      const enriched = enrichPlanStops(stops, mockPlaces);
      expect(enriched).toHaveLength(1);

      const stop = enriched[0];
      expect(stop.name).toBe("Là Việt Coffee");
      expect(stop.placeSlug).toBe("la-viet-coffee-dong-da");
      expect(stop.coverUrl).toBe("https://images.unsplash.com/photo-la-viet");
      expect(stop.icon).toBe("☕");
      expect(stop.category).toBe("cafe");
      expect(stop.lat).toBe(21.0125);
      expect(stop.lng).toBe(105.8265);
      expect(stop.address).toBe("Ngõ 100 Tây Sơn, Đống Đa, Hà Nội");
      expect(stop.isIndoor).toBe(true);
      expect(stop.duration).toBe(60);
      expect(stop.isLocked).toBe(true);
      expect(stop.lockedStartTime).toBe("15:00");
      expect(stop.note).toBe("Thử dòng Coldbrew cam sả");
      expect(stop.planBNote).toBe("");
    });

    it("parses and extracts [Plan B Mưa] notes properly", () => {
      const stops: PlanStopDto[] = [
        {
          id: "stop-2",
          placeId: "p2",
          customName: null,
          sortOrder: 1,
          plannedTime: "16:20",
          durationMin: 45,
          dayOffset: 0,
          startMinute: 980,
          travelMinutes: 20,
          isPinnedTime: false,
          note: "Ngắm hoàng hôn ven hồ\n[Plan B Mưa] Ghé quán cafe sách gần đó",
        },
      ];

      const enriched = enrichPlanStops(stops, mockPlaces);
      expect(enriched[0].note).toBe("Ngắm hoàng hôn ven hồ");
      expect(enriched[0].planBNote).toBe("[Plan B Mưa] Ghé quán cafe sách gần đó");
      expect(enriched[0].isIndoor).toBe(false);
    });

    it("handles custom uncataloged stop with graceful fallbacks", () => {
      const stops: PlanStopDto[] = [
        {
          id: "stop-custom",
          placeId: null,
          customName: "Quán cóc trà đá bờ hồ",
          sortOrder: 0,
          plannedTime: null,
          durationMin: 30,
          dayOffset: 0,
          startMinute: 900,
          travelMinutes: 0,
          isPinnedTime: false,
          note: null,
        },
      ];

      const enriched = enrichPlanStops(stops, mockPlaces);
      expect(enriched[0].name).toBe("Quán cóc trà đá bờ hồ");
      expect(enriched[0].placeSlug).toBeNull();
      expect(enriched[0].coverUrl).toBeNull();
      expect(enriched[0].lat).toBeNull();
      expect(enriched[0].lng).toBeNull();
      expect(enriched[0].isIndoor).toBe(true);
      expect(enriched[0].address).toBe("Hà Nội");
    });
  });

  describe("matchCatalogPlaceByName", () => {
    const places: HanoiPlace[] = [
      {
        id: "p1",
        slug: "la-viet-coffee",
        name: "Là Việt Coffee",
      } as HanoiPlace,
      {
        id: "p2",
        slug: "bao-tang-my-thuat-viet-nam",
        name: "Bảo Tàng Mỹ Thuật Việt Nam",
      } as HanoiPlace,
    ];

    it("matches exact or accent/case-insensitive place name", () => {
      expect(matchCatalogPlaceByName("Là Việt Coffee", places)?.id).toBe("p1");
      expect(matchCatalogPlaceByName("la viet coffee", places)?.id).toBe("p1");
      expect(matchCatalogPlaceByName("Bảo tàng mỹ thuật việt nam", places)?.id).toBe("p2");
    });

    it("returns null when no candidate matches", () => {
      expect(matchCatalogPlaceByName("Địa điểm không có trong catalog", places)).toBeNull();
    });
  });

  describe("DATING_TEMPLATES", () => {
    it("provides 3 default dating templates", () => {
      expect(DATING_TEMPLATES).toHaveLength(3);
      const ids = DATING_TEMPLATES.map((t) => t.id);
      expect(ids).toContain("chill-cafe");
      expect(ids).toContain("hoang-hon-ho-tay");
      expect(ids).toContain("foodtour-pho-co");
    });
  });
});

