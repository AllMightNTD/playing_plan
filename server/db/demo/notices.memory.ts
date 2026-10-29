import { getMemoryStore } from "@/server/db/demo/memory-store";
import type { RoomNoticeRecord, RoomNoticeRepository } from "@/server/db/repositories/types";

export const memoryRoomNoticeRepository: RoomNoticeRepository = {
  async listNotices(roomId: string, memberId?: string): Promise<RoomNoticeRecord[]> {
    return Array.from(getMemoryStore().notices.values())
      .filter((n) => n.roomId === roomId && (!n.memberId || n.memberId === memberId))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((n) => ({ ...n }));
  },

  async insertNotice(notice: RoomNoticeRecord): Promise<void> {
    getMemoryStore().notices.set(notice.id, { ...notice });
  },

  async markAsRead(roomId: string, noticeId: string, now: Date): Promise<boolean> {
    const notice = getMemoryStore().notices.get(noticeId);
    if (!notice || notice.roomId !== roomId || notice.readAt) return false;
    notice.readAt = now;
    return true;
  },
};
