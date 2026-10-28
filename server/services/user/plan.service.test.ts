import { beforeEach, describe, expect, it } from "vitest";
import { resetMemoryStore } from "@/server/db/demo/memory-store";
import { AppError, ERRORS } from "@/server/http/errors";
import { MAX_PLAN_STOPS } from "@/lib/constants/user";
import { createInvite, ensureRoomSession, joinRoom } from "./room.service";
import { createPlan, deletePlan, exportPlanCalendar, getPlanDetail, listPlans, updatePlan } from "./plan.service";
import {
  addChecklistItem,
  addStop,
  deleteChecklistItem,
  deleteStop,
  reorderStops,
  updateChecklistItem,
} from "./plan-items.service";

let ipCounter = 0;
const nextIp = () => `10.1.0.${++ipCounter}`;
const BASE_PLAN = { title: "Hồ Tây hoàng hôn", planDate: "2026-11-01", startTime: "16:30" };

async function expectAppError(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toSatisfy((error) => error instanceof AppError && error.definition.code === code);
}

async function createCouple() {
  const creator = (await ensureRoomSession(null, nextIp(), "Dũng")).session;
  const invite = await createInvite(creator);
  const partner = (await joinRoom(null, { token: invite.token, nickname: "Linh" }, nextIp())).session;
  return { creator, partner };
}

beforeEach(() => resetMemoryStore());

describe("plan CRUD", () => {
  it("should create a plan with the first stop from a published place", async () => {
    const { creator } = await createCouple();
    const plan = await createPlan(creator, { ...BASE_PLAN, placeId: "p1" });

    expect(plan.stops).toHaveLength(1);
    expect(plan.stops[0]).toMatchObject({ placeId: "p1", plannedTime: "16:30", sortOrder: 0 });
    expect(plan.updatedBy).toBe(creator.memberId);
  });

  it("should reject an unknown place", async () => {
    const { creator } = await createCouple();
    await expectAppError(createPlan(creator, { ...BASE_PLAN, placeId: "khong-ton-tai" }), ERRORS.PLACE.NOT_FOUND.code);
  });

  it("should let the partner edit and record who updated last", async () => {
    const { creator, partner } = await createCouple();
    const plan = await createPlan(creator, BASE_PLAN);
    const updated = await updatePlan(partner, plan.id, { title: "Đổi sang Hồ Gươm" });

    expect(updated.title).toBe("Đổi sang Hồ Gươm");
    expect(updated.updatedBy).toBe(partner.memberId);
  });

  it("should return an empty list when there is no session", async () => {
    expect(await listPlans(null)).toEqual([]);
  });
});

describe("tenant isolation", () => {
  it("should hide plans of another room behind 404 for read, update, delete and children", async () => {
    const { creator } = await createCouple();
    const stranger = (await ensureRoomSession(null, nextIp())).session;
    const plan = await createPlan(creator, { ...BASE_PLAN, placeId: "p1" });
    const notFound = ERRORS.PLAN.NOT_FOUND.code;

    await expectAppError(getPlanDetail(stranger, plan.id), notFound);
    await expectAppError(updatePlan(stranger, plan.id, { title: "hack" }), notFound);
    await expectAppError(deletePlan(stranger, plan.id), notFound);
    await expectAppError(deleteStop(stranger, plan.id, plan.stops[0].id), notFound);
    await expectAppError(addChecklistItem(stranger, plan.id, { content: "hack" }), notFound);

    expect((await getPlanDetail(creator, plan.id)).stops).toHaveLength(1);
    expect(await listPlans(stranger)).toEqual([]);
  });

  it("should reject assigning a checklist item to a member outside the room", async () => {
    const { creator } = await createCouple();
    const stranger = (await ensureRoomSession(null, nextIp())).session;
    const plan = await createPlan(creator, BASE_PLAN);
    await expectAppError(
      addChecklistItem(creator, plan.id, { content: "Sạc dự phòng", assignedTo: stranger.memberId }),
      ERRORS.ROOM.MEMBER_NOT_FOUND.code
    );
  });
});

describe("optimistic concurrency", () => {
  it("should reject an update based on a stale updatedAt", async () => {
    const { creator, partner } = await createCouple();
    const plan = await createPlan(creator, BASE_PLAN);
    const staleUpdatedAt = new Date(plan.updatedAt.getTime() - 1000);

    await expectAppError(
      updatePlan(partner, plan.id, { title: "Ghi đè", expectedUpdatedAt: staleUpdatedAt }),
      ERRORS.PLAN.CONFLICT.code
    );
    await updatePlan(partner, plan.id, { title: "OK", expectedUpdatedAt: plan.updatedAt });
  });
});

describe("stops", () => {
  it("should reorder stops and keep sort order compact after deletion", async () => {
    const { creator } = await createCouple();
    const plan = await createPlan(creator, BASE_PLAN);
    const a = await addStop(creator, plan.id, { customName: "A" });
    const b = await addStop(creator, plan.id, { customName: "B" });
    const c = await addStop(creator, plan.id, { customName: "C" });

    await reorderStops(creator, plan.id, [c.id, a.id, b.id]);
    expect((await getPlanDetail(creator, plan.id)).stops.map((s) => s.customName)).toEqual(["C", "A", "B"]);

    await deleteStop(creator, plan.id, a.id);
    const stops = (await getPlanDetail(creator, plan.id)).stops;
    expect(stops.map((s) => [s.customName, s.sortOrder])).toEqual([
      ["C", 0],
      ["B", 1],
    ]);
  });

  it("should reject a reorder that does not match the current stop set", async () => {
    const { creator } = await createCouple();
    const plan = await createPlan(creator, BASE_PLAN);
    const a = await addStop(creator, plan.id, { customName: "A" });
    await addStop(creator, plan.id, { customName: "B" });

    await expectAppError(reorderStops(creator, plan.id, [a.id]), ERRORS.PLAN.STOPS_CHANGED.code);
    await expectAppError(reorderStops(creator, plan.id, [a.id, "la"]), ERRORS.PLAN.STOPS_CHANGED.code);
  });

  it("should cap stops at the limit", async () => {
    const { creator } = await createCouple();
    const plan = await createPlan(creator, BASE_PLAN);
    for (let i = 0; i < MAX_PLAN_STOPS; i++) await addStop(creator, plan.id, { customName: `S${i}` });
    await expectAppError(addStop(creator, plan.id, { customName: "quá" }), ERRORS.PLAN.STOP_LIMIT_REACHED.code);
  });

  it("should return 404 when deleting a missing stop", async () => {
    const { creator } = await createCouple();
    const plan = await createPlan(creator, BASE_PLAN);
    await expectAppError(deleteStop(creator, plan.id, "missing"), ERRORS.PLAN.STOP_NOT_FOUND.code);
  });
});

describe("checklist", () => {
  it("should add, tick, assign to partner and delete items", async () => {
    const { creator, partner } = await createCouple();
    const plan = await createPlan(creator, BASE_PLAN);
    const item = await addChecklistItem(creator, plan.id, { content: "Sạc dự phòng" });

    await updateChecklistItem(partner, plan.id, item.id, { isDone: true, assignedTo: partner.memberId });
    expect((await getPlanDetail(creator, plan.id)).checklist[0]).toMatchObject({
      isDone: true,
      assignedTo: partner.memberId,
    });

    await deleteChecklistItem(creator, plan.id, item.id);
    await expectAppError(deleteChecklistItem(creator, plan.id, item.id), ERRORS.PLAN.CHECKLIST_ITEM_NOT_FOUND.code);
  });
});

describe("secret plans (F19)", () => {
  it("should mask details for the partner before reveal time but not for the creator", async () => {
    const { creator, partner } = await createCouple();
    const plan = await createPlan(creator, {
      ...BASE_PLAN,
      placeId: "p1",
      note: "Bí mật",
      isSecret: true,
      revealAt: new Date("2099-01-01T00:00:00Z"),
    });

    const partnerView = await getPlanDetail(partner, plan.id);
    expect(partnerView).toMatchObject({ isSecretLocked: true, note: null, stops: [] });
    expect(partnerView.title).not.toBe(BASE_PLAN.title);
    expect((await listPlans(partner))[0].title).not.toBe(BASE_PLAN.title);

    const creatorView = await getPlanDetail(creator, plan.id);
    expect(creatorView).toMatchObject({ isSecretLocked: false, title: BASE_PLAN.title });
    expect(creatorView.stops).toHaveLength(1);
  });

  it("should block partner edits and calendar export while locked but allow shared checklist", async () => {
    const { creator, partner } = await createCouple();
    const plan = await createPlan(creator, { ...BASE_PLAN, isSecret: true, revealAt: new Date("2099-01-01T00:00:00Z") });
    const locked = ERRORS.PLAN.SECRET_LOCKED.code;

    await expectAppError(updatePlan(partner, plan.id, { title: "đoán" }), locked);
    await expectAppError(addStop(partner, plan.id, { customName: "đoán" }), locked);
    await expectAppError(exportPlanCalendar(partner, plan.id), locked);
    await expectAppError(deletePlan(partner, plan.id), locked);
    await addChecklistItem(partner, plan.id, { content: "Mặc đồ tông kem" });
  });

  it("should default reveal time to 2 hours before the date", async () => {
    const { creator } = await createCouple();
    const plan = await createPlan(creator, { ...BASE_PLAN, isSecret: true });
    expect(plan.revealAt?.toISOString()).toBe("2026-11-01T07:30:00.000Z");
  });

  it("should unlock once reveal time has passed", async () => {
    const { creator, partner } = await createCouple();
    const plan = await createPlan(creator, { ...BASE_PLAN, isSecret: true, revealAt: new Date("2000-01-01T00:00:00Z") });
    expect((await getPlanDetail(partner, plan.id)).isSecretLocked).toBe(false);
  });
});

describe("exportPlanCalendar", () => {
  it("should use the first stop as location and the summed stop durations", async () => {
    const { creator } = await createCouple();
    const plan = await createPlan(creator, { ...BASE_PLAN, placeId: "p1" });
    await addStop(creator, plan.id, { customName: "Phở cuốn", durationMin: 90 });

    const ics = await exportPlanCalendar(creator, plan.id);
    expect(ics).toContain("LOCATION:Cầu Long Biên\\, ");
    expect(ics).toContain("DTSTART:20261101T093000Z");
    expect(ics).toContain("DTEND:20261101T120000Z");
  });
});
