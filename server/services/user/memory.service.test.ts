import { beforeEach, describe, expect, it } from "vitest";
import { resetMemoryStore } from "@/server/db/demo/memory-store";
import { AppError, ERRORS } from "@/server/http/errors";
import { MAX_MEMORY_NOTES } from "@/lib/constants/user";
import { createInvite, ensureRoomSession, joinRoom } from "./room.service";
import { createMemoryNote, deleteMemoryNote, getMemoryBoard } from "./memory.service";

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
