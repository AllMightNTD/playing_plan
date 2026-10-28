import { describe, it, expect, vi } from "vitest";
import {
  evaluateCandidateForPromotion,
  promoteCandidateToPlace,
} from "./promotion.gatekeeper";
import { runYoutubeMaintenanceCron } from "@/scripts/pipeline/youtube-maintenance-cron";
import { CandidatePlace, PlaceBlocklist, PlaceVideo } from "@/server/db/schema/governance";
import type { DbExecutor } from "@/server/db/client";

describe("Auto-Promotion Gatekeeper & 30-Day Maintenance", () => {
  const dummyCandidate: CandidatePlace = {
    id: "cnd_123",
    osmId: "node/999",
    name: "Santorini Lounge Cafe",
    searchName: "santorini lounge cafe",
    lat: "21.055000",
    lng: "105.820000",
    address: "Ven hồ Tây, Tây Hồ, Hà Nội",
    city: "hanoi",
    category: "cafe",
    rawTags: {
      amenity: "cafe",
      website: "https://santorini.vn",
      outdoor_seating: "yes",
    },
    datingScore: 75,
    evaluatedTier: null,
    evaluatedDateFit: null,
    batchId: null,
    status: "pending",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const dummyBlocklist: PlaceBlocklist[] = [
    {
      id: "blk_1",
      osmId: null,
      namePattern: ".*đường tàu.*",
      latMin: "21.026000",
      latMax: "21.032000",
      lngMin: "105.842000",
      lngMax: "105.846000",
      reason: "railway_safety",
      note: "Phố đường tàu",
      createdAt: new Date(),
    },
  ];

  const now = new Date("2026-10-28T12:00:00Z");

  it("should promote candidate when all 4 conditions are fully satisfied", () => {
    const validVideo: PlaceVideo = {
      placeId: "cnd_123",
      videoId: "vid_recent",
      channelId: "chn_1",
      channelTitle: "Khoai Lang Thang",
      hasPaidPlacement: false,
      confidenceScore: "85.00",
      status: "auto_linked",
      publishedAt: new Date("2026-05-01T00:00:00Z"), // ~5 tháng trước
      lastCheckedAt: now,
    };

    const res = evaluateCandidateForPromotion(
      dummyCandidate,
      [validVideo],
      dummyBlocklist,
      now
    );

    expect(res.promoted).toBe(true);
    expect(res.reasons.length).toBe(0);
    expect(res.conditions.notBlocklisted).toBe(true);
    expect(res.conditions.hasRecentVideo).toBe(true);
    expect(res.conditions.hasSecondOsmSignal).toBe(true);
    expect(res.conditions.datingScoreSufficient).toBe(true);
  });

  it("should reject promotion if candidate lacks a recent video in past 365 days", () => {
    const oldVideo: PlaceVideo = {
      placeId: "cnd_123",
      videoId: "vid_old",
      channelId: "chn_1",
      channelTitle: "Vlogger",
      hasPaidPlacement: false,
      confidenceScore: "85.00",
      status: "auto_linked",
      publishedAt: new Date("2024-01-01T00:00:00Z"), // > 2 năm trước
      lastCheckedAt: now,
    };

    const res = evaluateCandidateForPromotion(
      dummyCandidate,
      [oldVideo],
      dummyBlocklist,
      now
    );

    expect(res.promoted).toBe(false);
    expect(res.conditions.hasRecentVideo).toBe(false);
    expect(res.reasons.some((r) => r.includes("365 ngày"))).toBe(true);
  });

  it("should reject promotion if dating_score is below 60", () => {
    const lowScoreCandidate: CandidatePlace = {
      ...dummyCandidate,
      datingScore: 50,
    };

    const validVideo: PlaceVideo = {
      placeId: "cnd_123",
      videoId: "vid_recent",
      channelId: "chn_1",
      channelTitle: "Khoai Lang Thang",
      hasPaidPlacement: false,
      confidenceScore: "85.00",
      status: "auto_linked",
      publishedAt: new Date("2026-05-01T00:00:00Z"),
      lastCheckedAt: now,
    };

    const res = evaluateCandidateForPromotion(
      lowScoreCandidate,
      [validVideo],
      dummyBlocklist,
      now
    );

    expect(res.promoted).toBe(false);
    expect(res.conditions.datingScoreSufficient).toBe(false);
    expect(res.reasons.some((r) => r.includes("Điểm hẹn hò"))).toBe(true);
  });

  it("should reject promotion if candidate is blocklisted", () => {
    const blocklistedCandidate: CandidatePlace = {
      ...dummyCandidate,
      name: "Cafe Đường Tàu Phùng Hưng",
      lat: "21.028000",
      lng: "105.844000",
    };

    const validVideo: PlaceVideo = {
      placeId: "cnd_123",
      videoId: "vid_recent",
      channelId: "chn_1",
      channelTitle: "Khoai Lang Thang",
      hasPaidPlacement: false,
      confidenceScore: "85.00",
      status: "auto_linked",
      publishedAt: new Date("2026-05-01T00:00:00Z"),
      lastCheckedAt: now,
    };

    const res = evaluateCandidateForPromotion(
      blocklistedCandidate,
      [validVideo],
      dummyBlocklist,
      now
    );

    expect(res.promoted).toBe(false);
    expect(res.conditions.notBlocklisted).toBe(false);
  });

  describe("promoteCandidateToPlace DB execution", () => {
    it("should insert place and update candidate status to promoted", async () => {
      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });
      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const mockExecutor = {
        insert: mockInsert,
        update: mockUpdate,
      } as unknown as DbExecutor;

      const validVideo: PlaceVideo = {
        placeId: "cnd_123",
        videoId: "vid_recent",
        channelId: "chn_1",
        channelTitle: "Khoai Lang Thang",
        hasPaidPlacement: false,
        confidenceScore: "85.00",
        status: "auto_linked",
        publishedAt: new Date("2026-05-01T00:00:00Z"),
        lastCheckedAt: now,
      };

      const result = await promoteCandidateToPlace(
        dummyCandidate,
        [validVideo],
        dummyBlocklist,
        mockExecutor
      );

      expect(result.promoted).toBe(true);
      expect(result.promotedPlaceId).toBeDefined();
      expect(mockInsert).toHaveBeenCalledTimes(2); // 1 lần cho places, 1 lần cho placeMedia
      expect(mockUpdate).toHaveBeenCalledTimes(1); // update candidatePlaces status
    });
  });

  describe("30-Day Maintenance Cron", () => {
    it("should identify unembeddable or deleted videos and mark them as rejected", async () => {
      const mockVideos: PlaceVideo[] = [
        {
          placeId: "plc_1",
          videoId: "vid_ok",
          channelId: "chn_1",
          channelTitle: "Khoai",
          hasPaidPlacement: false,
          confidenceScore: "85.00",
          status: "auto_linked",
          publishedAt: new Date("2026-01-01"),
          lastCheckedAt: new Date("2026-09-01"), // > 30 ngày trước
        },
        {
          placeId: "plc_2",
          videoId: "vid_unembeddable_1",
          channelId: "chn_2",
          channelTitle: "Dino",
          hasPaidPlacement: false,
          confidenceScore: "80.00",
          status: "auto_linked",
          publishedAt: new Date("2026-01-01"),
          lastCheckedAt: new Date("2026-09-01"), // > 30 ngày trước
        },
      ];

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });
      const mockDelete = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      const mockExecutor = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(mockVideos),
            }),
          }),
        }),
        update: mockUpdate,
        delete: mockDelete,
      } as unknown as DbExecutor;

      const res = await runYoutubeMaintenanceCron({
        dryRun: true,
        daysThreshold: 30,
        executor: mockExecutor,
      });

      expect(res.scannedCount).toBe(2);
      expect(res.unembeddableOrDeletedCount).toBe(1);
      const rejectedItem = res.details.find((d) => d.videoId === "vid_unembeddable_1");
      expect(rejectedItem?.action).toBe("rejected_and_delinked");
    });
  });
});
