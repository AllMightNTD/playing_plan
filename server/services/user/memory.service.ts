import { nanoid } from "nanoid";
import { getUserRepositories } from "@/server/db/repositories";
import { AppError, ERRORS } from "@/server/http/errors";
import { DEFAULT_NICKNAME, MAX_MEMORIES_LISTED, MAX_MEMORY_NOTES, type MemoryNoteColor } from "@/lib/constants/user";
import type { MemberSession } from "@/server/db/repositories/types";
import type { MemoryNote } from "@/server/db/schema";
import type { CreateMemoryNoteBody } from "@/lib/validators/user";

export interface MemoryNoteDto {
  id: string;
  content: string;
  color: MemoryNoteColor;
  authorName: string;
  isMine: boolean;
  createdAt: Date;
}

export interface MemoryCardDto {
  id: string;
  planId: string;
  title: string;
  rating: number;
  journal: string | null;
  visitedAt: Date;
  coverUrl: string | null;
  coverCaption: string | null;
}

export interface MemoryBoardDto {
  notes: MemoryNoteDto[];
  memories: MemoryCardDto[];
}

function toMemoryNoteDto(note: MemoryNote, session: MemberSession, nicknameById: Map<string, string | null>): MemoryNoteDto {
  return {
    id: note.id,
    content: note.content,
    color: note.color,
    authorName: nicknameById.get(note.memberId) || DEFAULT_NICKNAME,
    isMine: note.memberId === session.memberId,
    createdAt: note.createdAt,
  };
}

async function loadNicknames(roomId: string): Promise<Map<string, string | null>> {
  const room = await getUserRepositories().rooms.getRoomOverview(roomId);
  return new Map((room?.members ?? []).map((member) => [member.id, member.nickname]));
}

/** Chưa có phiên thì bảng kỷ niệm trống, không tạo phòng chỉ vì người dùng xem trang. */
export async function getMemoryBoard(session: MemberSession | null): Promise<MemoryBoardDto> {
  if (!session) return { notes: [], memories: [] };

  const repo = getUserRepositories().memories;
  const [notes, memories, nicknameById] = await Promise.all([
    repo.listNotes(session.roomId, MAX_MEMORY_NOTES),
    repo.listMemories(session.roomId, MAX_MEMORIES_LISTED),
    loadNicknames(session.roomId),
  ]);

  return {
    notes: notes.map((note) => toMemoryNoteDto(note, session, nicknameById)),
    memories: memories.map((memory) => ({
      id: memory.id,
      planId: memory.planId,
      title: memory.planTitle || "Buổi hẹn của hai bạn",
      rating: memory.rating,
      journal: memory.journal,
      visitedAt: memory.visitedAt,
      coverUrl: memory.coverUrl,
      coverCaption: memory.coverCaption,
    })),
  };
}

export async function createMemoryNote(session: MemberSession, input: CreateMemoryNoteBody): Promise<MemoryNoteDto> {
  const note = await getUserRepositories().memories.insertNoteWithinLimit(
    {
      id: nanoid(21),
      roomId: session.roomId,
      memberId: session.memberId,
      content: input.content,
      color: input.color ?? "peach",
      createdAt: new Date(),
    },
    MAX_MEMORY_NOTES
  );
  if (!note) throw new AppError(ERRORS.MEMORY.NOTE_LIMIT_REACHED);
  return toMemoryNoteDto(note, session, await loadNicknames(session.roomId));
}

/** Giấy nhớ là đồ chung của phòng nên ai trong phòng cũng gỡ được. */
export async function deleteMemoryNote(session: MemberSession, noteId: string): Promise<void> {
  const deleted = await getUserRepositories().memories.deleteNote(session.roomId, noteId);
  if (!deleted) throw new AppError(ERRORS.MEMORY.NOTE_NOT_FOUND);
}
