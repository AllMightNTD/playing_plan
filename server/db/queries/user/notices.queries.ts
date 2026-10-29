import { and, desc, eq, isNull, or } from "drizzle-orm";
import { db } from "@/server/db/client";
import { roomNotices } from "@/server/db/schema";
import type { RoomNoticeRecord, RoomNoticeRepository } from "@/server/db/repositories/types";

export const drizzleRoomNoticeRepository: RoomNoticeRepository = {
  async listNotices(roomId: string, memberId?: string): Promise<RoomNoticeRecord[]> {
    const condition = memberId
      ? and(eq(roomNotices.roomId, roomId), or(isNull(roomNotices.memberId), eq(roomNotices.memberId, memberId)))
      : eq(roomNotices.roomId, roomId);

    const rows = await db
      .select()
      .from(roomNotices)
      .where(condition)
      .orderBy(desc(roomNotices.createdAt));

    return rows.map((r) => ({
      id: r.id,
      roomId: r.roomId,
      memberId: r.memberId,
      noticeType: r.noticeType,
      title: r.title,
      content: r.content,
      metadata: r.metadata,
      readAt: r.readAt,
      createdAt: r.createdAt,
    }));
  },

  async insertNotice(notice: RoomNoticeRecord): Promise<void> {
    await db.insert(roomNotices).values({
      id: notice.id,
      roomId: notice.roomId,
      memberId: notice.memberId,
      noticeType: notice.noticeType,
      title: notice.title,
      content: notice.content,
      metadata: notice.metadata,
      readAt: notice.readAt,
      createdAt: notice.createdAt,
    });
  },

  async markAsRead(roomId: string, noticeId: string, now: Date): Promise<boolean> {
    const result = await db
      .update(roomNotices)
      .set({ readAt: now })
      .where(and(eq(roomNotices.id, noticeId), eq(roomNotices.roomId, roomId), isNull(roomNotices.readAt)));

    const affected = (result as unknown as [{ affectedRows?: number }])?.[0]?.affectedRows ?? 0;
    return affected > 0;
  },
};
