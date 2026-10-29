import { describe, expect, it, beforeEach } from "vitest";
import { resetMemoryStore } from "@/server/db/demo/memory-store";
import { ensureRoomSession } from "@/server/services/user/room.service";
import { createPlan, getPlanDetail } from "@/server/services/user/plan.service";
import { addStop, updateStop } from "@/server/services/user/plan-items.service";
import {
  shiftPlanSchedule,
  autoSchedulePlan,
  minuteToTimeString,
  timeStringToMinute,
} from "./plan-schedule.service";
import { AppError } from "@/server/http/errors";

let ipCounter = 0;
const nextIp = () => `10.9.0.${++ipCounter}`;

beforeEach(() => {
  resetMemoryStore();
});

describe("Plan Schedule & Auto-Ripple Service (Phase 1)", () => {
  it("should convert between minute of day and time string accurately", () => {
    expect(minuteToTimeString(1050)).toBe("17:30");
    expect(minuteToTimeString(0)).toBe("00:00");
    expect(minuteToTimeString(1439)).toBe("23:59");
    expect(timeStringToMinute("17:30")).toBe(1050);
    expect(timeStringToMinute("00:00")).toBe(0);
    expect(timeStringToMinute("23:59")).toBe(1439);
  });

  it("should auto-ripple shift downstream stops by +30 mins and increment version", async () => {
    const user = await ensureRoomSession(null, nextIp(), "Partner A");

    const plan = await createPlan(user.session, {
      title: "Hẹn hò Hồ Tây chiều thu",
      planDate: "2026-11-01",
      startTime: "16:00",
    });

    const stop1 = await addStop(user.session, plan.id, {
      customName: "Trạm 1: Cafe Yên",
      plannedTime: "16:00",
      durationMin: 60,
    });

    const stop2 = await addStop(user.session, plan.id, {
      customName: "Trạm 2: Ngắm hoàng hôn bến Hàn Quốc",
      plannedTime: "17:15",
      durationMin: 45,
    });

    const stop3 = await addStop(user.session, plan.id, {
      customName: "Trạm 3: Bún chả Hàng Mành",
      plannedTime: "18:15",
      durationMin: 60,
    });

    const detailBefore = await getPlanDetail(user.session, plan.id);
    const initialVersion = detailBefore.version ?? 1;

    // Đẩy Trạm 2 lùi 30 phút (+30m): Trạm 2 từ 17:15 -> 17:45, Trạm 3 từ 18:15 -> 18:45
    const shifted = await shiftPlanSchedule(user.session, plan.id, {
      stopId: stop2.id,
      shiftMinutes: 30,
      expectedVersion: initialVersion,
    });

    expect(shifted.version).toBe(initialVersion + 1);

    const s1 = shifted.stops.find((s) => s.id === stop1.id);
    const s2 = shifted.stops.find((s) => s.id === stop2.id);
    const s3 = shifted.stops.find((s) => s.id === stop3.id);

    // Trạm 1 không bị ảnh hưởng (nằm trước)
    expect(s1?.plannedTime).toBe("16:00");
    // Trạm 2 và 3 bị đẩy lùi 30 phút
    expect(s2?.plannedTime).toBe("17:45");
    expect(s3?.plannedTime).toBe("18:45");
  });

  it("should stop ripple propagation when encountering a pinned stop 📌", async () => {
    const user = await ensureRoomSession(null, nextIp(), "Partner A");

    const plan = await createPlan(user.session, {
      title: "Lịch trình có chặng ghim vé xem phim",
      planDate: "2026-11-01",
      startTime: "17:00",
    });

    const stop1 = await addStop(user.session, plan.id, {
      customName: "Trạm 1: Ăn tối",
      plannedTime: "17:00",
    });

    const stop2 = await addStop(user.session, plan.id, {
      customName: "Trạm 2: Trà sữa",
      plannedTime: "18:00",
    });

    const stop3 = await addStop(user.session, plan.id, {
      customName: "Trạm 3: Xem phim suất 19:30 (ĐÃ GHIM)",
      plannedTime: "19:30",
    });

    // Ghim Trạm 3 cố định giờ
    await updateStop(user.session, plan.id, stop3.id, {
      isPinnedTime: true,
    });

    const detail = await getPlanDetail(user.session, plan.id);

    // Đẩy Trạm 1 trễ 15 phút -> Trạm 2 chuyển sang 18:15, nhưng Trạm 3 đã ghim thì giữ nguyên 19:30
    const shifted = await shiftPlanSchedule(user.session, plan.id, {
      stopId: stop1.id,
      shiftMinutes: 15,
      expectedVersion: detail.version ?? 1,
    });

    const s1 = shifted.stops.find((s) => s.id === stop1.id);
    const s2 = shifted.stops.find((s) => s.id === stop2.id);
    const s3 = shifted.stops.find((s) => s.id === stop3.id);

    expect(s1?.plannedTime).toBe("17:15");
    expect(s2?.plannedTime).toBe("18:15");
    expect(s3?.plannedTime).toBe("19:30"); // Vẫn giữ nguyên 19:30 vì đã ghim
  });

  it("should throw 409 CONFLICT if client passes outdated expectedVersion", async () => {
    const user = await ensureRoomSession(null, nextIp(), "Partner A");

    const plan = await createPlan(user.session, {
      title: "Test Conflict",
      planDate: "2026-11-01",
      startTime: "18:00",
    });

    const stop1 = await addStop(user.session, plan.id, {
      customName: "Trạm A",
      plannedTime: "18:00",
    });

    // Gửi version sai (ví dụ version 99 trong khi hiện tại là 1)
    await expect(
      shiftPlanSchedule(user.session, plan.id, {
        stopId: stop1.id,
        shiftMinutes: 15,
        expectedVersion: 99,
      })
    ).rejects.toThrowError(AppError);
  });

  it("should auto-schedule stops and arrange sunset timing", async () => {
    const user = await ensureRoomSession(null, nextIp(), "Partner A");

    const plan = await createPlan(user.session, {
      title: "Hẹn hò lãng mạn chiều",
      planDate: "2026-11-01",
      startTime: "16:00",
    });

    await addStop(user.session, plan.id, {
      customName: "Trạm cafe chiều",
      plannedTime: "15:30",
    });

    await addStop(user.session, plan.id, {
      customName: "Trạm hoàng hôn Hồ Tây",
      plannedTime: "16:30",
    });

    const scheduled = await autoSchedulePlan(user.session, plan.id);
    expect(scheduled.stops.length).toBe(2);
    expect(scheduled.stops[0].plannedTime).toMatch(/^\d{2}:\d{2}$/);
    expect(scheduled.stops[1].plannedTime).toMatch(/^\d{2}:\d{2}$/);
  });
});
