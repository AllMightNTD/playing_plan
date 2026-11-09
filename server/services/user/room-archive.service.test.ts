import { describe, expect, it, beforeEach } from "vitest";
import sharp from "sharp";
import { resetMemoryStore } from "@/server/db/demo/memory-store";
import { ensureRoomSession, recordRoomConsent } from "@/server/services/user/room.service";
import { createPlan } from "@/server/services/user/plan.service";
import { createMemoryNote } from "@/server/services/user/memory.service";
import { uploadRoomPhoto } from "./upload.service";
import { createRoomArchiveStream } from "./room-archive.service";
import { resetInMemoryPhotoStorage } from "@/server/storage/photo-storage.gateway";

let ipCounter = 0;
const nextIp = () => `10.8.0.${++ipCounter}`;

beforeEach(() => {
  resetMemoryStore();
  resetInMemoryPhotoStorage();
});

describe("Room Archive Service (Phase 0b - ZIP Export without fs)", () => {
  it("should generate a valid ZIP archive containing room info, plans, memories, and gateway photos", async () => {
    const user = await ensureRoomSession(null, nextIp(), "Partner A");
    await recordRoomConsent(user.session, "2026.1");

    await createPlan(user.session, {
      title: "Chuyến đi kỷ niệm 1 năm",
      planDate: "2026-11-15",
      startTime: "14:00",
    });

    await createMemoryNote(user.session, {
      content: "Nhớ mua hoa hướng dương cho em nhé!",
      color: "peach",
    });

    const photo = await sharp({
      create: { width: 32, height: 32, channels: 3, background: { r: 255, g: 120, b: 140 } },
    })
      .webp()
      .toBuffer();

    const uploaded = await uploadRoomPhoto(user.session, {
      fileName: "polaroid.webp",
      buffer: photo,
    });

    const { archive, fileName } = await createRoomArchiveStream(user.session);
    expect(fileName).toBe(`datemate-room-${user.session.roomId}-archive.zip`);

    const chunks: Buffer[] = [];
    archive.on("data", (chunk: Buffer) => chunks.push(chunk));

    await new Promise<void>((resolve, reject) => {
      archive.on("end", () => resolve());
      archive.on("error", (err: unknown) => reject(err));
      archive.finalize();
    });

    const zipBuffer = Buffer.concat(chunks);
    expect(zipBuffer.length).toBeGreaterThan(0);

    // ZIP header magic bytes: PK\x03\x04
    expect(zipBuffer[0]).toBe(0x50);
    expect(zipBuffer[1]).toBe(0x4b);
    expect(zipBuffer[2]).toBe(0x03);
    expect(zipBuffer[3]).toBe(0x04);

    // Verify photo entry name is embedded inside the ZIP central directory
    expect(zipBuffer.toString("latin1")).toContain(`photos/${uploaded.id}.webp`);
  });
});
