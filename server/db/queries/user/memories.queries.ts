import { and, count, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/server/db/client";
import { datePlans, memories, memoryNotes, memoryPhotos } from "@/server/db/schema";
import type { MemoryRepository } from "@/server/db/repositories/types";

export const drizzleMemoryRepository: MemoryRepository = {
  async listNotes(roomId, limit) {
    return db
      .select()
      .from(memoryNotes)
      .where(eq(memoryNotes.roomId, roomId))
      .orderBy(desc(memoryNotes.createdAt))
      .limit(limit);
  },

  async insertNoteWithinLimit(note, maxNotes) {
    return db.transaction(async (tx) => {
      const [{ total }] = await tx
        .select({ total: count() })
        .from(memoryNotes)
        .where(eq(memoryNotes.roomId, note.roomId));
      if (total >= maxNotes) return null;

      await tx.insert(memoryNotes).values(note);
      return note;
    });
  },

  async deleteNote(roomId, noteId) {
    const result = await db
      .delete(memoryNotes)
      .where(and(eq(memoryNotes.id, noteId), eq(memoryNotes.roomId, roomId)));
    return result.rowsAffected === 1;
  },

  async listMemories(roomId, limit) {
    const rows = await db
      .select({
        id: memories.id,
        planId: memories.planId,
        planTitle: datePlans.title,
        rating: memories.rating,
        journal: memories.journal,
        visitedAt: memories.visitedAt,
      })
      .from(memories)
      .leftJoin(datePlans, and(eq(datePlans.id, memories.planId), eq(datePlans.roomId, roomId)))
      .where(eq(memories.roomId, roomId))
      .orderBy(desc(memories.visitedAt))
      .limit(limit);
    if (rows.length === 0) return [];

    const photos = await db
      .select()
      .from(memoryPhotos)
      .where(inArray(memoryPhotos.memoryId, rows.map((row) => row.id)));
    const coverByMemory = new Map<string, (typeof photos)[number]>();
    for (const photo of photos) {
      const current = coverByMemory.get(photo.memoryId);
      if (!current || photo.sortOrder < current.sortOrder) coverByMemory.set(photo.memoryId, photo);
    }

    return rows.map((row) => {
      const cover = coverByMemory.get(row.id);
      return { ...row, coverUrl: cover?.url ?? null, coverCaption: cover?.caption ?? null };
    });
  },
};
