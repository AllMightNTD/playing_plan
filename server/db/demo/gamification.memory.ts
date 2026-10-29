import { getMemoryStore } from "@/server/db/demo/memory-store";
import type {
  BlindDateTicketRecord,
  GamificationRepository,
  PlaceCheckinRecord,
  SecretNoteRecord,
} from "@/server/db/repositories/types";

export const memoryGamificationRepository: GamificationRepository = {
  async getActiveBlindDateTicket(roomId: string): Promise<BlindDateTicketRecord | null> {
    const tickets = Array.from(getMemoryStore().blindDateTickets.values())
      .filter((t) => t.roomId === roomId && t.status === "in_progress")
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return tickets[0] ? { ...tickets[0], steps: tickets[0].steps.map((s) => ({ ...s })) } : null;
  },

  async createBlindDateTicket(ticket: BlindDateTicketRecord): Promise<void> {
    for (const existing of getMemoryStore().blindDateTickets.values()) {
      if (existing.roomId === ticket.roomId && existing.status === "in_progress") {
        existing.status = "cancelled";
      }
    }
    getMemoryStore().blindDateTickets.set(ticket.id, {
      ...ticket,
      steps: ticket.steps.map((s) => ({ ...s })),
    });
  },

  async updateBlindDateTicket(
    roomId: string,
    ticketId: string,
    currentStep: number,
    status: "in_progress" | "completed"
  ): Promise<BlindDateTicketRecord | null> {
    const ticket = getMemoryStore().blindDateTickets.get(ticketId);
    if (!ticket || ticket.roomId !== roomId) return null;
    ticket.currentStep = currentStep;
    ticket.status = status;
    ticket.updatedAt = new Date();
    ticket.steps.forEach((s) => {
      s.isUnlocked = s.step <= currentStep;
    });
    return { ...ticket, steps: ticket.steps.map((s) => ({ ...s })) };
  },

  async recordCheckin(checkin: PlaceCheckinRecord): Promise<void> {
    getMemoryStore().placeCheckins.set(checkin.id, { ...checkin });
  },

  async listCheckins(roomId: string): Promise<PlaceCheckinRecord[]> {
    return Array.from(getMemoryStore().placeCheckins.values())
      .filter((c) => c.roomId === roomId)
      .sort((a, b) => b.checkedInAt.getTime() - a.checkedInAt.getTime())
      .map((c) => ({ ...c }));
  },

  async createSecretNote(note: SecretNoteRecord): Promise<void> {
    getMemoryStore().secretNotes.set(note.id, { ...note });
  },

  async listSecretNotes(roomId: string): Promise<SecretNoteRecord[]> {
    return Array.from(getMemoryStore().secretNotes.values())
      .filter((n) => n.roomId === roomId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((n) => ({ ...n }));
  },

  async unlockSecretNotesForPlace(roomId: string, placeIdOrName: string, now: Date): Promise<SecretNoteRecord[]> {
    const unlocked: SecretNoteRecord[] = [];
    const query = placeIdOrName.toLowerCase().trim();
    for (const note of getMemoryStore().secretNotes.values()) {
      if (note.roomId === roomId && !note.isUnlocked) {
        if (
          note.placeId.toLowerCase() === query ||
          note.placeName.toLowerCase().includes(query) ||
          query.includes(note.placeName.toLowerCase())
        ) {
          note.isUnlocked = true;
          note.unlockedAt = now;
          unlocked.push({ ...note });
        }
      }
    }
    return unlocked;
  },
};
