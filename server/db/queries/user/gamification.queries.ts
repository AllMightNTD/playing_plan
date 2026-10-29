import { and, desc, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { blindDateTickets, placeCheckins, secretNotes } from "@/server/db/schema";
import type {
  BlindDateStep,
  BlindDateTicketRecord,
  GamificationRepository,
  PlaceCheckinRecord,
  SecretNoteRecord,
} from "@/server/db/repositories/types";

export const drizzleGamificationRepository: GamificationRepository = {
  async getActiveBlindDateTicket(roomId: string): Promise<BlindDateTicketRecord | null> {
    const rows = await db
      .select()
      .from(blindDateTickets)
      .where(and(eq(blindDateTickets.roomId, roomId), eq(blindDateTickets.status, "in_progress")))
      .orderBy(desc(blindDateTickets.createdAt))
      .limit(1);

    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      roomId: r.roomId,
      budgetTier: r.budgetTier,
      currentStep: r.currentStep,
      totalSteps: r.totalSteps,
      status: r.status,
      steps: (r.stepsData as BlindDateStep[]) || [],
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  },

  async createBlindDateTicket(ticket: BlindDateTicketRecord): Promise<void> {
    await db
      .update(blindDateTickets)
      .set({ status: "cancelled" })
      .where(and(eq(blindDateTickets.roomId, ticket.roomId), eq(blindDateTickets.status, "in_progress")));

    await db.insert(blindDateTickets).values({
      id: ticket.id,
      roomId: ticket.roomId,
      budgetTier: ticket.budgetTier,
      currentStep: ticket.currentStep,
      totalSteps: ticket.totalSteps,
      status: ticket.status,
      stepsData: ticket.steps,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    });
  },

  async updateBlindDateTicket(
    roomId: string,
    ticketId: string,
    currentStep: number,
    status: "in_progress" | "completed"
  ): Promise<BlindDateTicketRecord | null> {
    const ticket = await this.getActiveBlindDateTicket(roomId);
    if (!ticket || ticket.id !== ticketId) return null;

    const updatedSteps = ticket.steps.map((s) => ({
      ...s,
      isUnlocked: s.step <= currentStep,
    }));

    await db
      .update(blindDateTickets)
      .set({
        currentStep,
        status,
        stepsData: updatedSteps,
        updatedAt: new Date(),
      })
      .where(and(eq(blindDateTickets.id, ticketId), eq(blindDateTickets.roomId, roomId)));

    return {
      ...ticket,
      currentStep,
      status,
      steps: updatedSteps,
      updatedAt: new Date(),
    };
  },

  async recordCheckin(checkin: PlaceCheckinRecord): Promise<void> {
    await db.insert(placeCheckins).values({
      id: checkin.id,
      roomId: checkin.roomId,
      memberId: checkin.memberId,
      placeId: checkin.placeId,
      placeName: checkin.placeName,
      district: checkin.district,
      method: checkin.method,
      checkedInAt: checkin.checkedInAt,
    });
  },

  async listCheckins(roomId: string): Promise<PlaceCheckinRecord[]> {
    const rows = await db
      .select()
      .from(placeCheckins)
      .where(eq(placeCheckins.roomId, roomId))
      .orderBy(desc(placeCheckins.checkedInAt));

    return rows.map((r) => ({
      id: r.id,
      roomId: r.roomId,
      memberId: r.memberId,
      placeId: r.placeId,
      placeName: r.placeName,
      district: r.district,
      method: r.method,
      checkedInAt: r.checkedInAt,
    }));
  },

  async createSecretNote(note: SecretNoteRecord): Promise<void> {
    await db.insert(secretNotes).values({
      id: note.id,
      roomId: note.roomId,
      authorMemberId: note.authorMemberId,
      placeId: note.placeId,
      placeName: note.placeName,
      district: note.district,
      hint: note.hint,
      content: note.content,
      isUnlocked: note.isUnlocked,
      unlockedAt: note.unlockedAt,
      createdAt: note.createdAt,
    });
  },

  async listSecretNotes(roomId: string): Promise<SecretNoteRecord[]> {
    const rows = await db
      .select()
      .from(secretNotes)
      .where(eq(secretNotes.roomId, roomId))
      .orderBy(desc(secretNotes.createdAt));

    return rows.map((r) => ({
      id: r.id,
      roomId: r.roomId,
      authorMemberId: r.authorMemberId,
      placeId: r.placeId,
      placeName: r.placeName,
      district: r.district,
      hint: r.hint,
      content: r.content,
      isUnlocked: r.isUnlocked,
      unlockedAt: r.unlockedAt,
      createdAt: r.createdAt,
    }));
  },

  async unlockSecretNotesForPlace(roomId: string, placeIdOrName: string, now: Date): Promise<SecretNoteRecord[]> {
    const query = placeIdOrName.toLowerCase().trim();
    const allNotes = await this.listSecretNotes(roomId);
    const toUnlock = allNotes.filter(
      (n) =>
        !n.isUnlocked &&
        (n.placeId.toLowerCase() === query ||
          n.placeName.toLowerCase().includes(query) ||
          query.includes(n.placeName.toLowerCase()))
    );

    for (const note of toUnlock) {
      await db
        .update(secretNotes)
        .set({ isUnlocked: true, unlockedAt: now })
        .where(and(eq(secretNotes.id, note.id), eq(secretNotes.roomId, roomId)));
      note.isUnlocked = true;
      note.unlockedAt = now;
    }

    return toUnlock;
  },
};
