import { describe, expect, it, beforeEach } from "vitest";
import sharp from "sharp";
import { resetMemoryStore, getMemoryStore } from "@/server/db/demo/memory-store";
import {
  ensureRoomSession,
  recordRoomConsent,
  requestSoftDelete,
} from "@/server/services/user/room.service";
import { purgeExpiredSoftDeletedRooms } from "./room-cleanup.service";
import { uploadRoomPhoto } from "./upload.service";
import {
  getPhotoStorageGateway,
  resetInMemoryPhotoStorage,
} from "@/server/storage/photo-storage.gateway";

let ipCounter = 0;
const nextIp = () => `10.10.0.${++ipCounter}`;

beforeEach(() => {
  resetMemoryStore();
  resetInMemoryPhotoStorage();
});

describe("Room Soft-Delete Cleanup Cron (Phase 5 / Decree 13/2023)", () => {
  it("should NOT purge rooms within the 14-day retention window", async () => {
    const user = await ensureRoomSession(null, nextIp(), "User Active");
    await requestSoftDelete(user.session);

    const fiveDaysLater = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const result = await purgeExpiredSoftDeletedRooms(fiveDaysLater);

    expect(result.purgedCount).toBe(0);
    expect(result.purgedRoomIds).toEqual([]);

    const room = getMemoryStore().rooms.get(user.session.roomId);
    expect(room).toBeDefined();
    expect(room?.pendingDeletedAt).not.toBeNull();
  });

  it("should HARD DELETE rooms expired beyond 14 days and purge all room photos from storage gateway", async () => {
    const user = await ensureRoomSession(null, nextIp(), "User Expired");
    await recordRoomConsent(user.session, "2026.1");

    const sampleWebp = await sharp({
      create: { width: 40, height: 40, channels: 3, background: { r: 200, g: 80, b: 80 } },
    })
      .webp()
      .toBuffer();

    const uploaded = await uploadRoomPhoto(user.session, {
      fileName: "memory.webp",
      buffer: sampleWebp,
    });
    const storedRecord = getMemoryStore().uploads.get(uploaded.id);
    expect(storedRecord).toBeDefined();
    expect(await getPhotoStorageGateway().getPhoto(storedRecord!.relativePath)).not.toBeNull();

    await requestSoftDelete(user.session);

    const fifteenDaysLater = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
    const result = await purgeExpiredSoftDeletedRooms(fifteenDaysLater);

    expect(result.purgedCount).toBe(1);
    expect(result.purgedRoomIds).toContain(user.session.roomId);
    expect(getMemoryStore().rooms.get(user.session.roomId)).toBeUndefined();

    // Verify photo bytes are purged from storage (Zero-Residual Footprint)
    expect(await getPhotoStorageGateway().getPhoto(storedRecord!.relativePath)).toBeNull();
  });
});
