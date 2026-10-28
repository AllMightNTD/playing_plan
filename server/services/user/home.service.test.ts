import { describe, it, expect, beforeEach } from "vitest";
import {
  getHomePublic,
  getHomeSummary,
  quickAddStopToPlan,
} from "./home.service";
import { resetMemoryStore } from "@/server/db/demo/memory-store";
import { ensureRoomSession, createInvite, joinRoom } from "./room.service";

describe("Home Service & Integration APIs (F12, F13, F08, F01)", () => {
  beforeEach(() => {
    resetMemoryStore();
  });

  describe("getHomePublic", () => {
    it("should return comprehensive public home data for Hanoi", async () => {
      const res = await getHomePublic("hanoi");

      // 1. City meta
      expect(res.city).toBeDefined();
      expect(res.city.id).toBe("hanoi");
      expect(res.city.name).toBe("Hà Nội");
      expect(res.city.totalPlaces).toBeGreaterThan(0);

      // 2. Weather & SunCalc
      expect(res.weather).toBeDefined();
      expect(typeof res.weather.temp).toBe("number");
      expect(typeof res.weather.rainProbability).toBe("number");
      expect(res.weather.condition).toBeTruthy();
      expect(["sun", "sun_cloud", "cloud", "rain", "thunder"]).toContain(res.weather.icon);

      expect(res.sun).toBeDefined();
      expect(res.sun.goldenHour.start).toMatch(/^\d{2}:\d{2}$/);
      expect(res.sun.goldenHour.end).toMatch(/^\d{2}:\d{2}$/);
      expect(res.sun.blueHour.start).toMatch(/^\d{2}:\d{2}$/);
      expect(res.sun.blueHour.end).toMatch(/^\d{2}:\d{2}$/);

      // 3. Automated Tip
      expect(res.weatherTip).toBeTruthy();

      // 4. Curated places
      expect(Array.isArray(res.curatedPlaces)).toBe(true);
      expect(res.curatedPlaces.length).toBeLessThanOrEqual(3);
      if (res.curatedPlaces.length > 0) {
        expect(res.curatedPlaces[0].name).toBeTruthy();
        expect(res.curatedPlaces[0].status).toBe("published");
      }
    });
  });

  describe("getHomeSummary", () => {
    it("should return safe fallback summary for anonymous visitors", async () => {
      const summary = await getHomeSummary(null);

      expect(summary.room).toBeNull();
      expect(summary.upcomingPlan).toBeNull();
      expect(summary.badges).toEqual({
        matchCount: 0,
        hasUpcomingPlan: false,
        savedCount: 0,
        savedPlaceIds: [],
      });
    });

    it("should return couple room data, badges, and anniversary countdown for paired session", async () => {
      const creator = await ensureRoomSession(null, "10.0.0.1", "Dũng");
      const invite = await createInvite(creator.session);
      const partner = await joinRoom(null, { token: invite.token, nickname: "Linh" }, "10.0.0.2");

      const summary = await getHomeSummary(partner.session);

      expect(summary.room).toBeDefined();
      expect(summary.room?.name).toContain("Dũng");
      expect(summary.room?.memberCount).toBe(2);
      expect(summary.badges.savedCount).toBe(0);
      expect(summary.badges.matchCount).toBe(0);
      expect(summary.badges.hasUpcomingPlan).toBe(false);
    });
  });

  describe("quickAddStopToPlan", () => {
    it("should auto-create plan and add stop when user has no active plan", async () => {
      const creator = await ensureRoomSession(null, "10.0.0.3", "Linh");

      const result = await quickAddStopToPlan(creator.session, "p1");

      expect(result.success).toBe(true);
      expect(result.planId).toBeTruthy();
      expect(result.planTitle).toContain("Buổi hẹn cuối tuần");
      expect(result.placeName).toBeTruthy();

      // Sau khi thêm, home summary phải phản ánh có plan
      const summary = await getHomeSummary(creator.session);
      expect(summary.badges.hasUpcomingPlan).toBe(true);
      expect(summary.upcomingPlan).toBeDefined();
      expect(summary.upcomingPlan?.stops.length).toBeGreaterThanOrEqual(1);
      // Điểm dừng tạo kèm kế hoạch chỉ có placeId, preview vẫn phải hiện tên địa điểm
      expect(summary.upcomingPlan?.stops[0].title).toBe(result.placeName);
    });

    it("should add stop to existing upcoming plan", async () => {
      const creator = await ensureRoomSession(null, "10.0.0.4", "Dũng");

      // Lần 1: tạo plan
      const first = await quickAddStopToPlan(creator.session, "p1");
      expect(first.success).toBe(true);

      // Lần 2: thêm vào plan vừa tạo
      const second = await quickAddStopToPlan(creator.session, "p2");
      expect(second.success).toBe(true);
      expect(second.planId).toBe(first.planId);

      const summary = await getHomeSummary(creator.session);
      expect(summary.upcomingPlan?.stops.length).toBe(2);
    });
  });
});
