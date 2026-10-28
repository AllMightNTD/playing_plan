import { getMemoryStore } from "@/server/db/demo/memory-store";
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

  // Store demo chưa có luồng tạo kỷ niệm sau buổi hẹn nên luôn rỗng.
  async listMemories() {
    return [];
  },
};
