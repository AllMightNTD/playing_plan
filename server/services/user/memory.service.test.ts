import { beforeEach, describe, expect, it } from "vitest";
import { resetMemoryStore } from "@/server/db/demo/memory-store";
import { AppError, ERRORS } from "@/server/http/errors";
import { MAX_MEMORY_NOTES } from "@/lib/constants/user";
import { createInvite, ensureRoomSession, joinRoom } from "./room.service";
import { createPlan, getPlanDetail } from "./plan.service";
import {
  completePlanWithMemory,
  createMemoryNote,
  deleteMemoryNote,
  getMemoryBoard,
} from "./memory.service";
import { createPlanMemoryBodySchema } from "@/lib/validators/user";

let ipCounter = 0;
const nextIp = () => `10.1.0.${++ipCounter}`;

async function expectAppError(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toSatisfy((error) => error instanceof AppError && error.definition.code === code);
}

async function createPairedRoom() {
  const creator = await ensureRoomSession(null, nextIp(), "Dũng");
  const invite = await createInvite(creator.session);
  const partner = await joinRoom(null, { token: invite.token, nickname: "Linh" }, nextIp());
  return { creator: creator.session, partner: partner.session };
}

beforeEach(() => resetMemoryStore());

describe("getMemoryBoard", () => {
  it("should return an empty board without a session", async () => {
    expect(await getMemoryBoard(null)).toEqual({ notes: [], memories: [] });
  });
});

describe("createMemoryNote", () => {
  it("should share notes with the partner and newest first", async () => {
    const { creator, partner } = await createPairedRoom();
    await createMemoryNote(creator, { content: "Ghi chú 1" });
    await new Promise((resolve) => setTimeout(resolve, 5));
    await createMemoryNote(partner, { content: "Ghi chú 2", color: "olive" });

    const board = await getMemoryBoard(creator);
    expect(board.notes.map((note) => note.content)).toEqual(["Ghi chú 2", "Ghi chú 1"]);
    expect(board.notes[0]).toMatchObject({ authorName: "Linh", isMine: false, color: "olive" });
    expect(board.notes[1]).toMatchObject({ authorName: "Dũng", isMine: true, color: "peach" });
  });

  it("should not leak notes to another room", async () => {
    const { creator } = await createPairedRoom();
    const stranger = await ensureRoomSession(null, nextIp(), "Khách");
    await createMemoryNote(creator, { content: "Riêng tư" });

    expect((await getMemoryBoard(stranger.session)).notes).toEqual([]);
  });

  it("should reject once the room reaches the note limit", async () => {
    const { creator } = await createPairedRoom();
    for (let i = 0; i < MAX_MEMORY_NOTES; i++) await createMemoryNote(creator, { content: `#${i}` });

    await expectAppError(createMemoryNote(creator, { content: "quá tải" }), ERRORS.MEMORY.NOTE_LIMIT_REACHED.code);
  });
});

describe("deleteMemoryNote", () => {
  it("should let either partner remove a shared note", async () => {
    const { creator, partner } = await createPairedRoom();
    const note = await createMemoryNote(creator, { content: "Gỡ được" });

    await deleteMemoryNote(partner, note.id);
    expect((await getMemoryBoard(creator)).notes).toEqual([]);
  });

  it("should not delete a note from another room", async () => {
    const { creator } = await createPairedRoom();
    const stranger = await ensureRoomSession(null, nextIp(), "Khách");
    const note = await createMemoryNote(creator, { content: "Của phòng khác" });

    await expectAppError(deleteMemoryNote(stranger.session, note.id), ERRORS.MEMORY.NOTE_NOT_FOUND.code);
    expect((await getMemoryBoard(creator)).notes).toHaveLength(1);
  });
});

describe("completePlanWithMemory (6-Layer Matrix)", () => {
  it("marks plan as done and creates a shared memory card on the room board", async () => {
    const { creator, partner } = await createPairedRoom();
    const plan = await createPlan(creator, {
      title: "Hoàng hôn Hồ Tây",
      planDate: "2026-11-01",
      startTime: "16:30",
    });

    const created = await completePlanWithMemory(creator, {
      planId: plan.id,
      rating: 5,
      journal: "Nắng chiều đẹp xuất sắc, chụp được 2 cuộn film!",
    });

    expect(created).toMatchObject({
      planId: plan.id,
      title: "Hoàng hôn Hồ Tây",
      rating: 5,
      journal: "Nắng chiều đẹp xuất sắc, chụp được 2 cuộn film!",
    });

    const updatedPlan = await getPlanDetail(creator, plan.id);
    expect(updatedPlan.status).toBe("done");

    const partnerBoard = await getMemoryBoard(partner);
    expect(partnerBoard.memories).toHaveLength(1);
    expect(partnerBoard.memories[0]).toMatchObject({
      id: created.id,
      planId: plan.id,
      title: "Hoàng hôn Hồ Tây",
      rating: 5,
    });
  });

  it("handles optional empty journal gracefully", async () => {
    const { creator } = await createPairedRoom();
    const plan = await createPlan(creator, {
      title: "Cafe sáng phố cổ",
      planDate: "2026-11-01",
      startTime: "09:00",
    });

    const created = await completePlanWithMemory(creator, {
      planId: plan.id,
      rating: 4,
    });
    expect(created.journal).toBeNull();
    expect(created.rating).toBe(4);
  });

  it("is idempotent when both partners complete the same plan (updates existing memory without duplicates)", async () => {
    const { creator, partner } = await createPairedRoom();
    const plan = await createPlan(creator, {
      title: "Ăn tối kỷ niệm",
      planDate: "2026-11-01",
      startTime: "19:00",
    });

    const first = await completePlanWithMemory(creator, {
      planId: plan.id,
      rating: 4,
      journal: "Ghi chú lần 1",
    });
    const second = await completePlanWithMemory(partner, {
      planId: plan.id,
      rating: 5,
      journal: "Cập nhật cảm xúc trọn vẹn",
    });

    expect(second.id).toBe(first.id);
    const board = await getMemoryBoard(creator);
    expect(board.memories).toHaveLength(1);
    expect(board.memories[0]).toMatchObject({
      rating: 5,
      journal: "Cập nhật cảm xúc trọn vẹn",
    });
  });

  it("rejects partner completing a secret surprise plan before reveal time", async () => {
    const { creator, partner } = await createPairedRoom();
    const secretPlan = await createPlan(creator, {
      title: "Bất ngờ sinh nhật",
      planDate: "2099-12-31",
      startTime: "20:00",
      isSecret: true,
    });

    await expectAppError(
      completePlanWithMemory(partner, { planId: secretPlan.id, rating: 5 }),
      ERRORS.PLAN.SECRET_LOCKED.code
    );
  });

  it("rejects cross-room completion attempt with PLAN_NOT_FOUND", async () => {
    const { creator } = await createPairedRoom();
    const stranger = await ensureRoomSession(null, nextIp(), "Khách lạ");
    const plan = await createPlan(creator, {
      title: "Riêng tư Room A",
      planDate: "2026-11-01",
      startTime: "18:00",
    });

    await expectAppError(
      completePlanWithMemory(stranger.session, { planId: plan.id, rating: 5 }),
      ERRORS.PLAN.NOT_FOUND.code
    );
    expect((await getPlanDetail(creator, plan.id)).status).toBe("planned");
  });

  it("enforces strict Zod boundaries on rating (1..5) and journal length (<= 1000)", () => {
    expect(
      createPlanMemoryBodySchema.safeParse({ planId: "plan_1234567890", rating: 0 }).success
    ).toBe(false);
    expect(
      createPlanMemoryBodySchema.safeParse({ planId: "plan_1234567890", rating: 6 }).success
    ).toBe(false);
    expect(
      createPlanMemoryBodySchema.safeParse({
        planId: "plan_1234567890",
        rating: 5,
        journal: "x".repeat(1001),
      }).success
    ).toBe(false);
    expect(
      createPlanMemoryBodySchema.safeParse({
        planId: "plan_1234567890",
        rating: 5,
        extraKey: true,
      }).success
    ).toBe(false);
    expect(
      createPlanMemoryBodySchema.safeParse({
        planId: "plan_1234567890",
        rating: 5,
        journal: "  Buổi hẹn tuyệt vời  ",
      }).success
    ).toBe(true);
  });
});
