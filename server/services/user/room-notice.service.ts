import { nanoid } from "nanoid";
import { getUserRepositories } from "@/server/db/repositories";
import { AppError, ERRORS } from "@/server/http/errors";
import type { MemberSession, RoomNoticeRecord } from "@/server/db/repositories/types";

export interface RoomNoticeDto {
  id: string;
  noticeType: "room_delete_pending" | "new_match" | "plan_rsvp" | "time_change_request" | "secret_note_unlocked";
  title: string;
  content: string;
  metadata: unknown;
  isRead: boolean;
  createdAt: Date;
}

export async function listRoomNotices(session: MemberSession): Promise<RoomNoticeDto[]> {
  const repo = getUserRepositories();
  const notices = await repo.notices.listNotices(session.roomId, session.memberId);

  return notices.map((n) => ({
    id: n.id,
    noticeType: n.noticeType,
    title: n.title,
    content: n.content,
    metadata: n.metadata,
    isRead: Boolean(n.readAt),
    createdAt: n.createdAt,
  }));
}

export async function markNoticeAsRead(session: MemberSession, noticeId: string): Promise<void> {
  const repo = getUserRepositories();
  const updated = await repo.notices.markAsRead(session.roomId, noticeId, new Date());
  if (!updated) {
    throw new AppError(ERRORS.NOTICE.NOT_FOUND);
  }
}

export async function createRoomNotice(
  roomId: string,
  notice: {
    noticeType: "room_delete_pending" | "new_match" | "plan_rsvp" | "time_change_request" | "secret_note_unlocked";
    title: string;
    content: string;
    metadata?: unknown;
    memberId?: string | null;
  }
): Promise<void> {
  const repo = getUserRepositories();
  const record: RoomNoticeRecord = {
    id: nanoid(21),
    roomId,
    memberId: notice.memberId ?? null,
    noticeType: notice.noticeType,
    title: notice.title,
    content: notice.content,
    metadata: notice.metadata ?? null,
    readAt: null,
    createdAt: new Date(),
  };

  await repo.notices.insertNotice(record);
}
