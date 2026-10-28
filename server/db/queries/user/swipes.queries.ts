import { and, desc, eq, isNull, ne, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/server/db/client";
import { matches, roomMembers, swipes } from "@/server/db/schema";
import type { SwipeRepository } from "@/server/db/repositories/types";

const MAX_MATCHES_LISTED = 100;

export const drizzleSwipeRepository: SwipeRepository = {
  async listSwipedPlaceIds(roomId, memberId) {
    const rows = await db
      .select({ placeId: swipes.placeId })
      .from(swipes)
      .where(and(eq(swipes.roomId, roomId), eq(swipes.memberId, memberId)));
    return rows.map((row) => row.placeId);
  },

  async saveSwipeAndSyncMatch({ roomId, memberId, placeId, choice, now }) {
    return db.transaction(async (tx) => {
      await tx
        .insert(swipes)
        .values({ roomId, memberId, placeId, choice, createdAt: now })
        .onDuplicateKeyUpdate({ set: { choice, createdAt: now } });

      const isSamePlaceInRoom = and(eq(matches.roomId, roomId), eq(matches.placeId, placeId));

      if (choice === "nope") {
        await tx.delete(matches).where(and(isSamePlaceInRoom, eq(matches.status, "open")));
        return null;
      }

      const [partnerLike] = await tx
        .select({ memberId: swipes.memberId })
        .from(swipes)
        .innerJoin(roomMembers, eq(swipes.memberId, roomMembers.id))
        .where(
          and(
            eq(swipes.roomId, roomId),
            eq(swipes.placeId, placeId),
            eq(swipes.choice, "like"),
            ne(swipes.memberId, memberId),
            isNull(roomMembers.revokedAt)
          )
        )
        .limit(1);
      if (!partnerLike) return null;

      // Unique (room_id, place_id) chặn trùng khi hai người cùng vuốt một lúc.
      await tx
        .insert(matches)
        .values({ id: nanoid(21), roomId, placeId, matchedAt: now, status: "open" })
        .onDuplicateKeyUpdate({
          set: { status: sql`IF(${matches.status} = 'dismissed', 'open', ${matches.status})` },
        });

      const [match] = await tx.select({ id: matches.id }).from(matches).where(isSamePlaceInRoom).limit(1);
      return match?.id ?? null;
    });
  },

  async listMatches(roomId) {
    return db
      .select({
        id: matches.id,
        placeId: matches.placeId,
        matchedAt: matches.matchedAt,
        status: matches.status,
      })
      .from(matches)
      .where(and(eq(matches.roomId, roomId), ne(matches.status, "dismissed")))
      .orderBy(desc(matches.matchedAt))
      .limit(MAX_MATCHES_LISTED);
  },
};
