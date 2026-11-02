import { describe, expect, it, vi } from "vitest";
import type { CandidatePlace, PlaceVideo } from "@/server/db/schema/governance";
import type { DbExecutor } from "@/server/db/client";
import {
  buildPromotedPlaceBundle,
  mapCandidateCategory,
  persistPromotedPlaceBundle,
  resolveHanoiArea,
} from "./place-promotion.builder";

const BASE_CANDIDATE: CandidatePlace = {
  id: "cnd_westlake_01",
  osmId: "node/123456",
  name: "Maison De Blanc Bakery & Cafe",
  searchName: "maison de blanc bakery cafe",
  lat: "21.062500",
  lng: "105.823100",
  address: "5 Tây Hồ, Quảng An, Tây Hồ, Hà Nội",
  city: "hanoi",
  category: "cafe",
  rawTags: { amenity: "cafe", website: "https://maison.vn" },
  datingScore: 82,
  evaluatedTier: "A",
  evaluatedDateFit: "romantic",
  batchId: null,
  status: "pending",
  createdAt: new Date("2026-11-01T00:00:00Z"),
  updatedAt: new Date("2026-11-01T00:00:00Z"),
};

describe("place-promotion.builder", () => {
  it("resolves Hanoi districts accurately without defaulting unknown addresses to Tây Hồ", () => {
    expect(resolveHanoiArea("25 Tống Duy Tân, Hoàn Kiếm, Hà Nội")).toBe("Hoàn Kiếm");
    expect(resolveHanoiArea("102 Triệu Việt Vương", { "addr:district": "Hai Bà Trưng" })).toBe("Hai Bà Trưng");
    expect(resolveHanoiArea("Ngõ nhỏ chưa rõ quận", {}, 20.95, 105.77)).toBe("Hà Đông");
    expect(resolveHanoiArea("Địa chỉ chung Hà Nội", {})).toBe("Hà Nội");
  });

  it("maps dirty or legacy OSM categories strictly into valid 7 PlaceCategory values", () => {
    expect(mapCandidateCategory("restaurant")).toBe("food");
    expect(mapCandidateCategory("bakery")).toBe("food");
    expect(mapCandidateCategory("bar")).toBe("fun");
    expect(mapCandidateCategory("park")).toBe("nature");
    expect(mapCandidateCategory("viewpoint")).toBe("photo");
    expect(mapCandidateCategory("museum")).toBe("indoor");
    expect(mapCandidateCategory("promenade")).toBe("walk");
    expect(mapCandidateCategory("something_unknown")).toBe("cafe");
  });

  it("preserves candidate.id across place, guide, and 4+ media items", () => {
    const linkedVideo: PlaceVideo = {
      placeId: BASE_CANDIDATE.id,
      videoId: "yt_abc123",
      channelId: "ch_1",
      channelTitle: "Ninh Titô",
      hasPaidPlacement: false,
      confidenceScore: "88.00",
      status: "auto_linked",
      publishedAt: new Date("2026-09-01T00:00:00Z"),
      lastCheckedAt: new Date("2026-11-01T00:00:00Z"),
    };

    const bundle = buildPromotedPlaceBundle(BASE_CANDIDATE, {
      batchId: "batch_test_01",
      tier: "A",
      linkedVideos: [linkedVideo],
    });

    expect(bundle.place.id).toBe(BASE_CANDIDATE.id);
    expect(bundle.guide.placeId).toBe(BASE_CANDIDATE.id);
    expect(bundle.place.area).toBe("Tây Hồ");
    expect(bundle.place.batchId).toBe("batch_test_01");
    expect(bundle.media.length).toBe(5); // 4 curated Unsplash angles + 1 auto_linked YouTube video
    expect(bundle.media.every((m) => m.placeId === BASE_CANDIDATE.id)).toBe(true);
  });

  it("persists place, guide, media sequentially and marks candidate promoted", async () => {
    const bundle = buildPromotedPlaceBundle(BASE_CANDIDATE, { batchId: "batch_seq" });
    const callOrder: string[] = [];

    const mockInsert = vi.fn().mockImplementation(() => ({
      values: vi.fn().mockImplementation(() => {
        callOrder.push("insert");
        const promise = Promise.resolve(undefined) as Promise<undefined> & {
          onDuplicateKeyUpdate: () => Promise<undefined>;
        };
        promise.onDuplicateKeyUpdate = () => Promise.resolve(undefined);
        return promise;
      }),
    }));
    const mockUpdate = vi.fn().mockImplementation(() => ({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(async () => {
          callOrder.push("update_candidate");
        }),
      }),
    }));

    const executor = { insert: mockInsert, update: mockUpdate } as unknown as DbExecutor;
    await persistPromotedPlaceBundle(executor, bundle);

    // 1 place + 1 guide + 4 gallery media = 6 inserts, followed by 1 candidate update
    expect(mockInsert).toHaveBeenCalledTimes(6);
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(callOrder.at(-1)).toBe("update_candidate");
  });
});
