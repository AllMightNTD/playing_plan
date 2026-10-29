import { describe, expect, it, beforeEach } from "vitest";
import { resetMemoryStore } from "@/server/db/demo/memory-store";
import { ensureRoomSession, requestSoftDelete } from "@/server/services/user/room.service";
import { listRoomNotices, markNoticeAsRead } from "./room-notice.service";

let ipCounter = 0;
const nextIp = () => `10.7.0.${++ipCounter}`;

beforeEach(() => {
  resetMemoryStore();
});

describe("Room Notices Service (Phase 0b)", () => {
  it("should create notice on soft delete and allow room members to list and read it", async () => {
    const userA = await ensureRoomSession(null, nextIp(), "User A");

    // Ban đầu chưa có thông báo
    const initialNotices = await listRoomNotices(userA.session);
    expect(initialNotices.length).toBe(0);

    // Yêu cầu xóa mềm phòng -> Bắn thông báo room_delete_pending
    await requestSoftDelete(userA.session);

    const noticesAfterDelete = await listRoomNotices(userA.session);
    expect(noticesAfterDelete.length).toBe(1);
    expect(noticesAfterDelete[0].noticeType).toBe("room_delete_pending");
    expect(noticesAfterDelete[0].isRead).toBe(false);

    // Đánh dấu đã đọc
    await markNoticeAsRead(userA.session, noticesAfterDelete[0].id);

    const noticesAfterRead = await listRoomNotices(userA.session);
    expect(noticesAfterRead[0].isRead).toBe(true);
  });

  it("should isolate notices between different rooms", async () => {
    const userA = await ensureRoomSession(null, nextIp(), "User A");
    const userB = await ensureRoomSession(null, nextIp(), "User B");

    await requestSoftDelete(userA.session);

    // Room A có 1 thông báo
    const noticesA = await listRoomNotices(userA.session);
    expect(noticesA.length).toBe(1);

    // Room B hoàn toàn không nhìn thấy thông báo của Room A
    const noticesB = await listRoomNotices(userB.session);
    expect(noticesB.length).toBe(0);
  });
});
