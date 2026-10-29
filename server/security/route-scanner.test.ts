import { describe, expect, it, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import { resetMemoryStore } from "@/server/db/demo/memory-store";
import { ensureRoomSession } from "@/server/services/user/room.service";
import { createPlan, getPlanDetail, updatePlan, deletePlan } from "@/server/services/user/plan.service";
import { addStop, updateStop, deleteStop } from "@/server/services/user/plan-items.service";
import { createMemoryNote, deleteMemoryNote } from "@/server/services/user/memory.service";
import { assertRoomIsolation } from "./room-isolation.helper";

/**
 * PUBLIC ALLOWLIST: Danh mục các route công khai không cần session
 * Bắt buộc đồng bộ với Master Plan Mục 4.1!
 */
export const PUBLIC_ALLOWLIST = new Set([
  "home/public",
  "places",
  "places/random",
  "places/[slug]",
  "places/[slug]/view",
  "places/[slug]/report",
  "plans/invite/[inviteToken]/rsvp",
  "plans/share/[shareToken]",
  "search/suggest",
  "videos",
  "videos/[videoId]/hotspots",
  "rooms/join",
  "rooms/recover",
  "rooms/recovery-key/redeem",
]);

/**
 * PROTECTED ROUTES: Danh mục các route bắt buộc có session và phải được kiểm tra cô lập phòng
 */
export const PROTECTED_ROUTES = new Set([
  "gamification/blind-date",
  "gamification/check-in",
  "gamification/scratch-map",
  "gamification/secret-notes",
  "home/summary",
  "matches",
  "matches/[id]/seen",
  "me",
  "memories",
  "memories/notes",
  "memories/notes/[noteId]",
  "memories/tracks",
  "memories/[id]/virtual-video",
  "plans",
  "plans/quick-add",
  "plans/[id]",
  "plans/[id]/auto-schedule",
  "plans/[id]/checklist",
  "plans/[id]/checklist/[itemId]",
  "plans/[id]/export.ics",
  "plans/[id]/plan-b",
  "plans/[id]/poster-data",
  "plans/[id]/ripple-shift",
  "plans/[id]/share",
  "plans/[id]/share/revoke",
  "plans/[id]/stops",
  "plans/[id]/stops/reorder",
  "plans/[id]/stops/[stopId]",
  "recommend",
  "rooms/archive",
  "rooms/conflict",
  "rooms/consent",
  "rooms/invite",
  "rooms/leave",
  "rooms/me",
  "rooms/members/[memberId]",
  "rooms/notices",
  "rooms/notices/[id]/read",
  "rooms/recovery-key",
  "rooms/restore",
  "saved",
  "saved/[placeId]",
  "session",
  "swipes",
  "swipes/deck",
  "uploads",
  "uploads/[fileId]",
]);

function discoverAllUserRoutes(dir: string, baseDir: string = dir): string[] {
  const routes: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      routes.push(...discoverAllUserRoutes(fullPath, baseDir));
    } else if (entry.isFile() && entry.name === "route.ts") {
      const relDir = path.relative(baseDir, dir).replace(/\\/g, "/");
      routes.push(relDir);
    }
  }

  return routes.sort();
}

let ipCounter = 0;
const nextIp = () => `10.5.0.${++ipCounter}`;

beforeEach(() => resetMemoryStore());

describe("CI Route Scanner (Zero-Leak Security Audit)", () => {
  const userApiDir = path.resolve(process.cwd(), "app/api/v1/user");
  const discoveredRoutes = discoverAllUserRoutes(userApiDir);

  it("should discover at least 35 routes under app/api/v1/user", () => {
    expect(discoveredRoutes.length).toBeGreaterThanOrEqual(35);
  });

  it("should fail CI if any route in app/api/v1/user is unclassified", () => {
    const unclassifiedRoutes: string[] = [];

    for (const route of discoveredRoutes) {
      const isPublic = PUBLIC_ALLOWLIST.has(route);
      const isProtected = PROTECTED_ROUTES.has(route);

      if (!isPublic && !isProtected) {
        unclassifiedRoutes.push(route);
      }
    }

    expect(
      unclassifiedRoutes,
      `Phát hiện route chưa được phân loại vào Allowlist hoặc Protected Matrix: ${unclassifiedRoutes.join(", ")}. CI FAIL để chống lọt route riêng tư!`
    ).toEqual([]);
  });

  it("should ensure Public Allowlist and Protected Routes are strictly disjoint", () => {
    const overlap: string[] = [];
    for (const route of PUBLIC_ALLOWLIST) {
      if (PROTECTED_ROUTES.has(route)) {
        overlap.push(route);
      }
    }
    expect(overlap, `Mâu thuẫn phân loại: Route vừa public vừa protected: ${overlap.join(", ")}`).toEqual([]);
  });
});

describe("Room Isolation Suite (Multi-Tenant Cross-Access Prevention)", () => {
  it("should prevent User B from reading a plan belonging to Room A", async () => {
    const userA = await ensureRoomSession(null, nextIp(), "User A");
    const userB = await ensureRoomSession(null, nextIp(), "User B");

    const planA = await createPlan(userA.session, {
      title: "Hẹn hò bí mật Room A",
      planDate: "2026-11-01",
      startTime: "16:00",
    });

    // User A xem được
    const detailA = await getPlanDetail(userA.session, planA.id);
    expect(detailA.title).toBe("Hẹn hò bí mật Room A");

    // User B truy cập bằng id của planA -> Bắt buộc ném 404
    await assertRoomIsolation(async () => {
      await getPlanDetail(userB.session, planA.id);
    });
  });

  it("should prevent User B from modifying or deleting Room A's plan", async () => {
    const userA = await ensureRoomSession(null, nextIp(), "User A");
    const userB = await ensureRoomSession(null, nextIp(), "User B");

    const planA = await createPlan(userA.session, {
      title: "Kế hoạch gốc Room A",
      planDate: "2026-11-01",
      startTime: "17:00",
    });

    // User B cố tình update plan của Room A
    await assertRoomIsolation(async () => {
      await updatePlan(userB.session, planA.id, { title: "Bị hacker B sửa" });
    });

    // User B cố tình delete plan của Room A
    await assertRoomIsolation(async () => {
      await deletePlan(userB.session, planA.id);
    });

    // Kế hoạch của Room A vẫn an toàn
    const detail = await getPlanDetail(userA.session, planA.id);
    expect(detail.title).toBe("Kế hoạch gốc Room A");
  });

  it("should prevent User B from modifying or deleting stops in Room A's plan", async () => {
    const userA = await ensureRoomSession(null, nextIp(), "User A");
    const userB = await ensureRoomSession(null, nextIp(), "User B");

    const planA = await createPlan(userA.session, {
      title: "Lộ trình Room A",
      planDate: "2026-11-01",
      startTime: "18:00",
    });

    const stopA = await addStop(userA.session, planA.id, {
      customName: "Trạm ngắm hoàng hôn của A",
      plannedTime: "18:30",
    });

    // User B cố thêm trạm vào plan của A
    await assertRoomIsolation(async () => {
      await addStop(userB.session, planA.id, {
        customName: "Trạm lạ do B thêm",
      });
    });

    // User B cố sửa trạm của A
    await assertRoomIsolation(async () => {
      await updateStop(userB.session, planA.id, stopA.id, {
        customName: "Bị B đổi tên",
      });
    });

    // User B cố xóa trạm của A
    await assertRoomIsolation(async () => {
      await deleteStop(userB.session, planA.id, stopA.id);
    });
  });

  it("should prevent User B from accessing or deleting Room A's memory notes", async () => {
    const userA = await ensureRoomSession(null, nextIp(), "User A");
    const userB = await ensureRoomSession(null, nextIp(), "User B");

    const noteA = await createMemoryNote(userA.session, {
      content: "Ghi chú tình yêu riêng tư của Room A",
      color: "peach",
    });

    // User B cố xóa ghi chú của Room A
    await assertRoomIsolation(async () => {
      await deleteMemoryNote(userB.session, noteA.id);
    });
  });
});
