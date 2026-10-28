import { describe, it, expect } from "vitest";
import { scoreDateWorthiness, OsmPlaceCandidateInput } from "./date-worthiness.scorer";
import { PlaceBlocklist } from "@/server/db/schema/governance";

describe("Date-Worthiness Scorer", () => {
  const dummyBlocklist: PlaceBlocklist[] = [
    {
      id: "blk_train_street",
      osmId: null,
      namePattern: ".*đường tàu.*",
      latMin: "21.026000",
      latMax: "21.032000",
      lngMin: "105.842000",
      lngMax: "105.846000",
      reason: "railway_safety",
      note: "Phố cà phê đường tàu",
      createdAt: new Date(),
    },
  ];

  it("should drop blocklisted place immediately with score 0", () => {
    const input: OsmPlaceCandidateInput = {
      osmId: "node/123",
      name: "Cafe Đường Tàu Phùng Hưng",
      lat: 21.028,
      lng: 105.844,
      category: "cafe",
      tags: { amenity: "cafe", opening_hours: "08:00-22:00" },
    };

    const result = scoreDateWorthiness(input, dummyBlocklist);
    expect(result.isBlocklisted).toBe(true);
    expect(result.score).toBe(0);
    expect(result.passesThreshold).toBe(false);
  });

  it("should heavily penalize street cart and junk places", () => {
    const input: OsmPlaceCandidateInput = {
      osmId: "node/456",
      name: "Trà đá vỉa hè Bà Ba",
      lat: 21.02,
      lng: 105.85,
      category: "cafe",
      tags: { amenity: "cafe" },
    };

    const result = scoreDateWorthiness(input, dummyBlocklist);
    expect(result.isBlocklisted).toBe(false);
    expect(result.breakdown.penaltyScore).toBe(-40);
    expect(result.passesThreshold).toBe(false);
    expect(result.score).toBe(0); // 25 - 40 = -15 -> capped at 0
  });

  it("should award high score for romantic cafe with lake view and contacts", () => {
    const input: OsmPlaceCandidateInput = {
      osmId: "node/789",
      name: "Santorini Lounge Cafe Hồ Tây",
      lat: 21.055,
      lng: 105.82,
      category: "cafe",
      tags: {
        amenity: "cafe",
        "contact:facebook": "https://fb.com/santorini",
        outdoor_seating: "yes",
        view: "lake",
        opening_hours: "07:30-23:00",
      },
    };

    const result = scoreDateWorthiness(input, dummyBlocklist);
    expect(result.isBlocklisted).toBe(false);
    expect(result.breakdown.categoryScore).toBe(25);
    expect(result.breakdown.contactSignalsScore).toBe(20);
    expect(result.breakdown.romanticAmenitiesScore).toBe(25);
    expect(result.breakdown.structuredHoursScore).toBe(10);
    expect(result.score).toBe(80);
    expect(result.passesThreshold).toBe(true);
  });

  it("should not pass threshold if score is below 40", () => {
    const input: OsmPlaceCandidateInput = {
      osmId: "node/101",
      name: "Quán Ăn Nhỏ",
      lat: 21.01,
      lng: 105.81,
      category: "restaurant",
      tags: {
        amenity: "restaurant",
        opening_hours: "09:00-21:00",
      },
    };

    // Category: +25, Opening hours: +10 => 35
    const result = scoreDateWorthiness(input, dummyBlocklist);
    expect(result.score).toBe(35);
    expect(result.passesThreshold).toBe(false);
  });
});
