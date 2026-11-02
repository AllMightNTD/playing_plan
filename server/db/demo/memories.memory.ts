import { getMemoryStore } from "@/server/db/demo/memory-store";
import type { Memory } from "@/server/db/schema";
import type { MemoryRepository } from "@/server/db/repositories/types";

export const memoryMemoryRepository: MemoryRepository = {
  async listNotes(roomId, limit) {
    return [...getMemoryStore().memoryNotes.values()]
      .filter((note) => note.roomId === roomId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
      .map((note) => ({ ...note }));
  },

  async insertNoteWithinLimit(note, maxNotes) {
    const { memoryNotes } = getMemoryStore();
    const total = [...memoryNotes.values()].filter((existing) => existing.roomId === note.roomId).length;
    if (total >= maxNotes) return null;
    memoryNotes.set(note.id, { ...note });
    return { ...note };
  },

  async deleteNote(roomId, noteId) {
    const { memoryNotes } = getMemoryStore();
    if (memoryNotes.get(noteId)?.roomId !== roomId) return false;
    return memoryNotes.delete(noteId);
  },

  async listMemories(roomId, limit) {
    const store = getMemoryStore();
    return [...store.memories.values()]
      .filter((mem) => mem.roomId === roomId)
      .sort((a, b) => b.visitedAt.getTime() - a.visitedAt.getTime())
      .slice(0, limit)
      .map((mem) => {
        const plan = store.plans.get(mem.planId);
        return {
          id: mem.id,
          planId: mem.planId,
          planTitle: plan?.roomId === roomId ? plan.title : null,
          rating: mem.rating,
          journal: mem.journal,
          visitedAt: mem.visitedAt,
          coverUrl: null,
          coverCaption: null,
        };
      });
  },

  async saveCompletedPlanMemory(input) {
    const store = getMemoryStore();
    const plan = store.plans.get(input.planId);
    if (plan && plan.roomId === input.roomId) {
      plan.status = "done";
      plan.updatedAt = input.now;
      plan.updatedBy = input.memberId;
      plan.version = (plan.version ?? 1) + 1;
    }

    const existing = [...store.memories.values()].find(
      (mem) => mem.roomId === input.roomId && mem.planId === input.planId
    );

    if (existing) {
      existing.rating = input.rating;
      existing.journal = input.journal;
      existing.visitedAt = input.now;
      return {
        id: existing.id,
        planId: existing.planId,
        planTitle: input.planTitle,
        rating: existing.rating,
        journal: existing.journal,
        visitedAt: existing.visitedAt,
        coverUrl: null,
        coverCaption: null,
      };
    }

    const created: Memory = {
      id: input.id,
      planId: input.planId,
      roomId: input.roomId,
      rating: input.rating,
      journal: input.journal,
      dominantColor: null,
      timelineConfig: null,
      musicTrackId: null,
      visitedAt: input.now,
      createdAt: input.now,
    };
    store.memories.set(created.id, created);

    return {
      id: created.id,
      planId: created.planId,
      planTitle: input.planTitle,
      rating: created.rating,
      journal: created.journal,
      visitedAt: created.visitedAt,
      coverUrl: null,
      coverCaption: null,
    };
  },
};
