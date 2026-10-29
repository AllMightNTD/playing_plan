import { describe, expect, it, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import { resetMemoryStore, getMemoryStore } from "@/server/db/demo/memory-store";
import { ensureRoomSession, requestSoftDelete } from "@/server/services/user/room.service";
import { purgeExpiredSoftDeletedRooms, SOFT_DELETE_RETENTION_MS } from "./room-cleanup.service";
import { getStorageRootDir } from "./upload.service";

let ipCounter = 0;
const nextIp = () => `10.10.0.${++ipCounter}`;

beforeEach(() => {
  resetMemoryStore();
});

describe("Room Soft-Delete Cleanup Cron (Phase 5 / Decree 13/2023)", () => {
  it("should NOT purge rooms within the 14-day retention window", async () => {
    const user = await ensureRoomSession(null, nextIp(), "User Active");
    await requestSoftDelete(user.session);

    // Giả lập thời gian mới trôi qua 5 ngày (< 14 ngày)
    const fiveDaysLater = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const result = await purgeExpiredSoftDeletedRooms(fiveDaysLater);

    expect(result.purgedCount).toBe(0);
    expect(result.purgedRoomIds).toEqual([]);

    // Phòng vẫn còn tồn tại trong hệ thống
    const room = getMemoryStore().rooms.get(user.session.roomId);
    expect(room).toBeDefined();
    expect(room?.pendingDeletedAt).not.toBeNull();
  });

  it("should HARD DELETE rooms expired beyond 14 days and clean up storage files", async () => {
    const user = await ensureRoomSession(null, nextIp(), "User Expired");
    await requestSoftDelete(user.session);

    // Tạo thư mục và file giả lập trên đĩa lưu trữ ngoài web root
    const rootDir = getStorageRootDir();
    const roomDir = path.join(rootDir, "rooms", user.session.roomId);
    fs.mkdirSync(roomDir, { recursive: true });
    const dummyFile = path.join(roomDir, "photo.webp");
    fs.writeFileSync(dummyFile, "dummy webp data");
    expect(fs.existsSync(dummyFile)).toBe(true);

    // Giả lập thời gian 15 ngày sau (quá hạn 14 ngày)
    const fifteenDaysLater = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
    const result = await purgeExpiredSoftDeletedRooms(fifteenDaysLater);

    expect(result.purgedCount).toBe(1);
    expect(result.purgedRoomIds).toContain(user.session.roomId);

    // Phòng đã bị xóa vĩnh viễn khỏi DB / Store
    const room = getMemoryStore().rooms.get(user.session.roomId);
    expect(room).toBeUndefined();

    // Thư mục lưu trữ trên đĩa đã bị xóa sạch (Zero-Residual Footprint)
    expect(fs.existsSync(roomDir)).toBe(false);
  });
});
