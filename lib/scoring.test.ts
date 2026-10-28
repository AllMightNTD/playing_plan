import { describe, it, expect } from "vitest";
import {
  scorePlace,
  selectCandidates,
  pickDiverseByCategory,
  recommendPlaces,
  type ScorablePlace,
  type RecommendCriteria,
} from "./scoring";

const mockPlaces: ScorablePlace[] = [
  {
    slug: "place-photo-cheap",
    category: "photo",
    priceLevel: 1,
    moods: ["photo", "romantic"],
    indoor: false,
    costText: "Miễn phí",
    bestTimeText: "Hợp đi lúc 17:30",
    lat: 21.04,
    lng: 105.85,
  },
  {
    slug: "place-cafe-medium",
    category: "cafe",
    priceLevel: 2,
    moods: ["romantic", "chill"],
    indoor: true,
    costText: "200k",
    bestTimeText: "Hợp đi lúc 16:00",
    lat: 21.03,
    lng: 105.84,
  },
  {
    slug: "place-food-expensive",
    category: "food",
    priceLevel: 3,
    moods: ["food", "romantic"],
    indoor: true,
    costText: "600k",
    bestTimeText: "Hợp đi lúc 19:00",
    lat: 21.02,
    lng: 105.83,
  },
  {
    slug: "place-walk-cheap",
    category: "walk",
    priceLevel: 1,
    moods: ["chill"],
    indoor: false,
    costText: "Miễn phí",
    bestTimeText: "Hợp đi lúc 17:00",
    lat: 21.05,
    lng: 105.86,
  },
];

describe("Scoring Engine (F05 Wizard)", () => {
  it("chấm điểm tối đa khi khớp toàn bộ mood, ngân sách và khung giờ", () => {
    const criteria: RecommendCriteria = {
      budget: 1,
      moods: ["photo", "romantic"],
      slot: "sunset",
      transport: "motorbike",
    };

    const scored = scorePlace(mockPlaces[0], criteria);
    expect(scored.score).toBe(100);
    expect(scored.reasons.length).toBeGreaterThanOrEqual(2);
  });

  it("ưu tiên địa điểm trong nhà khi trời mưa", () => {
    const criteriaRainy: RecommendCriteria = {
      budget: 2,
      moods: ["romantic"],
      slot: "sunset",
      transport: "motorbike",
      isRainy: true,
    };

    const outdoorScore = scorePlace(mockPlaces[0], criteriaRainy).score;
    const indoorScore = scorePlace(mockPlaces[1], criteriaRainy).score;

    expect(indoorScore).toBeGreaterThan(outdoorScore);
  });

  it("tự động nới lỏng ngân sách trước, rồi tới mood khi ít ứng viên", () => {
    const strictCriteria: RecommendCriteria = {
      budget: 1,
      moods: ["food"], // Chỉ có place-food-expensive (level 3)
      slot: "sunset",
      transport: "motorbike",
    };

    const candidates = selectCandidates(mockPlaces, strictCriteria, 1);
    expect(candidates.length).toBeGreaterThanOrEqual(1);
    expect(candidates.some((p) => p.slug === "place-food-expensive")).toBe(true);
  });

  it("chọn đa dạng danh mục, không trùng lặp loại hình liên tiếp", () => {
    const sameCatPlaces = [
      { ...mockPlaces[0], slug: "p1", category: "cafe" as const },
      { ...mockPlaces[0], slug: "p2", category: "cafe" as const },
      { ...mockPlaces[0], slug: "p3", category: "photo" as const },
      { ...mockPlaces[0], slug: "p4", category: "walk" as const },
    ].map((p, idx) => ({ place: p, score: 90 - idx, reasons: [] }));

    const diverse = pickDiverseByCategory(sameCatPlaces, 3);
    const categories = diverse.map((d) => d.place.category);

    expect(new Set(categories).size).toBe(3);
  });

  it("recommendPlaces trả về đúng số lượng và loại trừ các slug chỉ định", () => {
    const criteria: RecommendCriteria = {
      budget: 2,
      moods: ["romantic", "chill"],
      slot: "sunset",
      transport: "motorbike",
    };

    const result = recommendPlaces(mockPlaces, criteria, {
      limit: 2,
      excludeSlugs: ["place-photo-cheap"],
      random: () => 0, // Deterministic
    });

    expect(result.length).toBe(2);
    expect(result.every((r) => r.place.slug !== "place-photo-cheap")).toBe(true);
  });
});
