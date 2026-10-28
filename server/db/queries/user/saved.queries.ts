import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { savedPlaces } from "@/server/db/schema";
import type { SavedPlaceRepository } from "@/server/db/repositories/types";

const MAX_SAVED_LISTED = 200;

export const drizzleSavedPlaceRepository: SavedPlaceRepository = {
  async listPlaceIds(memberId) {
    const rows = await db
      .select({ placeId: savedPlaces.placeId })
      .from(savedPlaces)
      .where(eq(savedPlaces.memberId, memberId))
      .orderBy(desc(savedPlaces.createdAt))
      .limit(MAX_SAVED_LISTED);
    return rows.map((row) => row.placeId);
  },

  async save(memberId, placeId, now) {
    // Lưu lại lần nữa là no-op (idempotent khi double-submit).
    await db
      .insert(savedPlaces)
      .values({ memberId, placeId, createdAt: now })
      .onDuplicateKeyUpdate({ set: { createdAt: sql`${savedPlaces.createdAt}` } });
  },

  async remove(memberId, placeId) {
    await db.delete(savedPlaces).where(and(eq(savedPlaces.memberId, memberId), eq(savedPlaces.placeId, placeId)));
  },
};
