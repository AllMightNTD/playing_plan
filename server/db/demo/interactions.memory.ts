import { nanoid } from "nanoid";
import { getMemoryStore } from "@/server/db/demo/memory-store";
import type { SavedPlaceRepository, SwipeRepository } from "@/server/db/repositories/types";

/**
 * Ngưỡng cần để match:
 * - Couple: cần 2 lượt like (cả 2 người)
 * - Group: cần >= 50% số thành viên active (tối thiểu 2)
 */
function hasEnoughLikes(roomId: string, placeId: string): boolean {
  const { swipes, members, rooms } = getMemoryStore();
  const roomType = rooms.get(roomId)?.roomType ?? "couple";
  const totalActive = [...members.values()].filter((m) => m.roomId === roomId && !m.revokedAt).length;
  const likesCount = [...swipes.values()].filter(
    (s) => s.roomId === roomId && s.placeId === placeId && s.choice === "like" && !members.get(s.memberId)?.revokedAt
  ).length;
  const threshold = roomType === "group" ? Math.max(2, Math.ceil(totalActive * 0.5)) : 2;
  return likesCount >= threshold;
}

export const memorySwipeRepository: SwipeRepository = {
  async listSwipedPlaceIds(roomId, memberId) {
    return [...getMemoryStore().swipes.values()]
      .filter((swipe) => swipe.roomId === roomId && swipe.memberId === memberId)
      .map((swipe) => swipe.placeId);
  },

  async undoSwipe({ roomId, memberId, placeId }) {
    const { swipes, matches } = getMemoryStore();
    const swipeKey = `${memberId}:${placeId}`;
    const swipe = swipes.get(swipeKey);
    if (!swipe || swipe.roomId !== roomId) return { status: "not_found" as const };

    const matchKey = `${roomId}:${placeId}`;
    const match = matches.get(matchKey);
    if (swipe.choice === "like" && match?.status === "planned") return { status: "match_planned" as const };

    swipes.delete(swipeKey);
    if (swipe.choice === "like" && match?.status === "open" && !hasEnoughLikes(roomId, placeId)) {
      matches.delete(matchKey);
      return { status: "undone" as const, removedMatchId: match.id };
    }
    return { status: "undone" as const, removedMatchId: null };
  },

  async syncPlannedMatches(roomId) {
    const { matches, stopsByPlan } = getMemoryStore();
    const plannedPlaceIds = new Set(
      [...stopsByPlan.values()].flat().filter((stop) => stop.roomId === roomId && stop.placeId).map((stop) => stop.placeId)
    );
    for (const match of matches.values()) {
      if (match.roomId !== roomId || match.status === "dismissed") continue;
      match.status = plannedPlaceIds.has(match.placeId) ? "planned" : "open";
    }
  },

  async saveSwipeAndSyncMatch({ roomId, memberId, placeId, choice, now }) {
    const { swipes, matches } = getMemoryStore();
    swipes.set(`${memberId}:${placeId}`, { roomId, memberId, placeId, choice });

    const matchKey = `${roomId}:${placeId}`;
    const existing = matches.get(matchKey);

    if (choice === "nope") {
      if (existing?.status === "open") matches.delete(matchKey);
      return { matchId: null, isNewMatch: false };
    }

    if (!hasEnoughLikes(roomId, placeId)) {
      return { matchId: null, isNewMatch: false };
    }

    if (existing) {
      const wasDismissed = existing.status === "dismissed";
      if (wasDismissed) {
        existing.status = "open";
        existing.isSeen = false;
        existing.matchedAt = now;
        return { matchId: existing.id, isNewMatch: true };
      }
      return { matchId: existing.id, isNewMatch: false };
    }

    const match = { id: nanoid(21), roomId, placeId, matchedAt: now, status: "open" as const, isSeen: false };
    matches.set(matchKey, match);
    return { matchId: match.id, isNewMatch: true };
  },

  async listMatches(roomId) {
    return [...getMemoryStore().matches.values()]
      .filter((match) => match.roomId === roomId && match.status !== "dismissed")
      .sort((a, b) => b.matchedAt.getTime() - a.matchedAt.getTime())
      .map(({ id, placeId, matchedAt, status, isSeen }) => ({
        id,
        placeId,
        matchedAt,
        status,
        isSeen: isSeen ?? false,
      }));
  },

  async markMatchSeen(roomId, matchId) {
    for (const match of getMemoryStore().matches.values()) {
      if (match.roomId === roomId && match.id === matchId) {
        match.isSeen = true;
        return true;
      }
    }
    return false;
  },
};

export const memorySavedPlaceRepository: SavedPlaceRepository = {
  async listPlaceIds(memberId) {
    const saved = getMemoryStore().savedByMember.get(memberId);
    if (!saved) return [];
    return [...saved.entries()].sort((a, b) => b[1].getTime() - a[1].getTime()).map(([placeId]) => placeId);
  },

  async save(memberId, placeId, now) {
    const { savedByMember } = getMemoryStore();
    const saved = savedByMember.get(memberId) ?? new Map<string, Date>();
    if (!saved.has(placeId)) saved.set(placeId, now);
    savedByMember.set(memberId, saved);
  },

  async remove(memberId, placeId) {
    getMemoryStore().savedByMember.get(memberId)?.delete(placeId);
  },
};
