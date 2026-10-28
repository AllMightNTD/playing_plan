import { describe, expect, it } from "vitest";
import { collectPublishIssues } from "./place-admin.policy";

const READY_PLACE = {
  coverUrl: "https://res.cloudinary.com/demo/cover.webp",
  lat: "21.043600",
  lng: "105.859400",
  moods: ["photo"],
};
const EMPTY_GUIDE = { bestTimes: null, photoSpots: null, poses: null, outfit: null, tips: null, crowdNotes: null };

describe("collectPublishIssues", () => {
  it("should pass a complete place with at least one guide item", () => {
    expect(collectPublishIssues(READY_PLACE, { ...EMPTY_GUIDE, tips: "Gửi xe gầm cầu" })).toEqual({});
  });

  it("should report every missing required field", () => {
    const issues = collectPublishIssues({ ...READY_PLACE, coverUrl: " ", lat: "0", lng: "0", moods: [] }, null);
    expect(issues).toEqual({
      coverUrl: "COVER_REQUIRED",
      lat: "COORDINATES_REQUIRED",
      moods: "MOOD_REQUIRED",
      guide: "GUIDE_REQUIRED",
    });
  });

  it("should treat empty guide arrays and blank text as missing content", () => {
    const blankGuide = { ...EMPTY_GUIDE, photoSpots: [], tips: "  ", outfit: { palette: [], tonSurTon: "", contrast: "", avoid: "", weatherTip: "" } };
    expect(collectPublishIssues(READY_PLACE, blankGuide)).toEqual({ guide: "GUIDE_REQUIRED" });
  });
});
