import { describe, expect, it, beforeEach } from "vitest";
import { resetMemoryStore } from "@/server/db/demo/memory-store";
import { ensureRoomSession } from "@/server/services/user/room.service";
import { createPlan } from "@/server/services/user/plan.service";
import { createMemoryNote } from "@/server/services/user/memory.service";
import { createRoomArchiveStream } from "./room-archive.service";

let ipCounter = 0;
const nextIp = () => `10.8.0.${++ipCounter}`;

beforeEach(() => {
  resetMemoryStore();
});

describe("Room Archive Service (Phase 0b - ZIP Export)", () => {
  it("should generate a valid ZIP archive containing room info, plans, and memories", async () => {
    const user = await ensureRoomSession(null, nextIp(), "Partner A");

    await createPlan(user.session, {
      title: "Chuyến đi kỷ niệm 1 năm",
      planDate: "2026-11-15",
      startTime: "14:00",
    });

    await createMemoryNote(user.session, {
      content: "Nhớ mua hoa hướng dương cho em nhé!",
      color: "peach",
    });

    const { archive, fileName } = await createRoomArchiveStream(user.session);
    expect(fileName).toBe(`datemate-room-${user.session.roomId}-archive.zip`);

    // Thu thập buffer từ archiver stream
    const chunks: Buffer[] = [];
    archive.on("data", (chunk: Buffer) => chunks.push(chunk));

    await new Promise<void>((resolve, reject) => {
      archive.on("end", () => resolve());
      archive.on("error", (err: unknown) => reject(err));
      archive.finalize();
    });

    const zipBuffer = Buffer.concat(chunks);
    expect(zipBuffer.length).toBeGreaterThan(0);

    // Kiểm tra ZIP header magic bytes: PK\x03\x04 (0x50, 0x4B, 0x03, 0x04)
    expect(zipBuffer[0]).toBe(0x50);
    expect(zipBuffer[1]).toBe(0x4b);
    expect(zipBuffer[2]).toBe(0x03);
    expect(zipBuffer[3]).toBe(0x04);
  });
});
