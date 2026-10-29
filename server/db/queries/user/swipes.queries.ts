import { and, desc, eq, isNull, ne, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/server/db/client";
import { matches, planStops, roomMembers, rooms, swipes } from "@/server/db/schema";
import type { SwipeRepository, SwipeSyncResult } from "@/server/db/repositories/types";

const MAX_MATCHES_LISTED = 100;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Couple cần đủ 2 like; group cần ≥ 50% thành viên đang hoạt động (tối thiểu 2). */
async function hasEnoughLikes(tx: Tx, roomId: string, placeId: string): Promise<boolean> {
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
  const threshold = roomType === "group" ? Math.max(2, Math.ceil(activeMembers.length * 0.5)) : 2;

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
  return likes.length >= threshold;
}

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

      if (!(await hasEnoughLikes(tx, roomId, placeId))) {
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

  async undoSwipe({ roomId, memberId, placeId }) {
    return db.transaction(async (tx) => {
      const isMySwipe = and(eq(swipes.roomId, roomId), eq(swipes.memberId, memberId), eq(swipes.placeId, placeId));
      const [swipe] = await tx.select({ choice: swipes.choice }).from(swipes).where(isMySwipe).limit(1);
      if (!swipe) return { status: "not_found" as const };

      const isSamePlaceInRoom = and(eq(matches.roomId, roomId), eq(matches.placeId, placeId));
      const [match] = await tx
        .select({ id: matches.id, status: matches.status })
        .from(matches)
        .where(isSamePlaceInRoom)
        .limit(1);
      if (swipe.choice === "like" && match?.status === "planned") return { status: "match_planned" as const };

      await tx.delete(swipes).where(isMySwipe);

      // Gỡ like có thể làm Match mất ngưỡng; nhóm đông người thì có thể vẫn đủ
      if (swipe.choice === "like" && match?.status === "open" && !(await hasEnoughLikes(tx, roomId, placeId))) {
        await tx.delete(matches).where(eq(matches.id, match.id));
        return { status: "undone" as const, removedMatchId: match.id };
      }
      return { status: "undone" as const, removedMatchId: null };
    });
  },

  async syncPlannedMatches(roomId) {
    const placeIsInSomeStop = sql`EXISTS (SELECT 1 FROM ${planStops} WHERE ${planStops.roomId} = ${matches.roomId} AND ${planStops.placeId} = ${matches.placeId})`;
    await db.transaction(async (tx) => {
      await tx
        .update(matches)
        .set({ status: "planned" })
        .where(and(eq(matches.roomId, roomId), eq(matches.status, "open"), placeIsInSomeStop));
      await tx
        .update(matches)
        .set({ status: "open" })
        .where(and(eq(matches.roomId, roomId), eq(matches.status, "planned"), sql`NOT ${placeIsInSomeStop}`));
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
