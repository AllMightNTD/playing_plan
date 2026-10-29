import { and, desc, eq, isNull, ne, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/server/db/client";
import { matches, roomMembers, rooms, swipes } from "@/server/db/schema";
import type { SwipeRepository, SwipeSyncResult } from "@/server/db/repositories/types";

const MAX_MATCHES_LISTED = 100;

export const drizzleSwipeRepository: SwipeRepository = {
  async listSwipedPlaceIds(roomId, memberId) {
    const rows = await db
      .select({ placeId: swipes.placeId })
      .from(swipes)
      .where(and(eq(swipes.roomId, roomId), eq(swipes.memberId, memberId)));
    return rows.map((row) => row.placeId);
  },

  async saveSwipeAndSyncMatch({ roomId, memberId, placeId, choice, now }): Promise<SwipeSyncResult> {
    return db.transaction(async (tx) => {
      await tx
        .insert(swipes)
        .values({ roomId, memberId, placeId, choice, createdAt: now })
        .onDuplicateKeyUpdate({ set: { choice, createdAt: now } });

      const isSamePlaceInRoom = and(eq(matches.roomId, roomId), eq(matches.placeId, placeId));

      if (choice === "nope") {
        await tx.delete(matches).where(and(isSamePlaceInRoom, eq(matches.status, "open")));
        return { matchId: null, isNewMatch: false };
      }

      // Xác định roomType & số lượng thành viên active
      const [room] = await tx
        .select({ roomType: rooms.roomType })
        .from(rooms)
        .where(eq(rooms.id, roomId))
        .limit(1);
      const roomType = room?.roomType ?? "couple";

      const activeMembers = await tx
        .select({ id: roomMembers.id })
        .from(roomMembers)
        .where(and(eq(roomMembers.roomId, roomId), isNull(roomMembers.revokedAt)));
      const totalActive = activeMembers.length;
      const threshold = roomType === "group" ? Math.max(2, Math.ceil(totalActive * 0.5)) : 2;

      const likes = await tx
        .select({ memberId: swipes.memberId })
        .from(swipes)
        .innerJoin(roomMembers, eq(swipes.memberId, roomMembers.id))
        .where(
          and(
            eq(swipes.roomId, roomId),
            eq(swipes.placeId, placeId),
            eq(swipes.choice, "like"),
            isNull(roomMembers.revokedAt)
          )
        );

      if (likes.length < threshold) {
        return { matchId: null, isNewMatch: false };
      }

      // Kiểm tra match hiện có
      const [existing] = await tx
        .select({ id: matches.id, status: matches.status, isSeen: matches.isSeen })
        .from(matches)
        .where(isSamePlaceInRoom)
        .limit(1);

      if (existing) {
        const wasDismissed = existing.status === "dismissed";
        if (wasDismissed) {
          await tx
            .update(matches)
            .set({ status: "open", isSeen: false, matchedAt: now })
            .where(eq(matches.id, existing.id));
          return { matchId: existing.id, isNewMatch: true };
        }
        return { matchId: existing.id, isNewMatch: false };
      }

      const newMatchId = nanoid(21);
      await tx.insert(matches).values({
        id: newMatchId,
        roomId,
        placeId,
        matchedAt: now,
        status: "open",
        isSeen: false,
      });

      return { matchId: newMatchId, isNewMatch: true };
    });
  },

  async listMatches(roomId) {
    return db
      .select({
        id: matches.id,
        placeId: matches.placeId,
        matchedAt: matches.matchedAt,
        status: matches.status,
        isSeen: matches.isSeen,
      })
      .from(matches)
      .where(and(eq(matches.roomId, roomId), ne(matches.status, "dismissed")))
      .orderBy(desc(matches.matchedAt))
      .limit(MAX_MATCHES_LISTED);
  },

  async markMatchSeen(roomId, matchId) {
    const result = await db
      .update(matches)
      .set({ isSeen: true })
      .where(and(eq(matches.roomId, roomId), eq(matches.id, matchId)));
    const affected = (result as unknown as [{ affectedRows?: number }])?.[0]?.affectedRows ?? 0;
    return affected > 0;
  },
};
