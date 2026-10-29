import { nanoid } from "nanoid";
import { getMemoryStore } from "@/server/db/demo/memory-store";
import type { SavedPlaceRepository, SwipeRepository } from "@/server/db/repositories/types";

export const memorySwipeRepository: SwipeRepository = {
  async listSwipedPlaceIds(roomId, memberId) {
    return [...getMemoryStore().swipes.values()]
      .filter((swipe) => swipe.roomId === roomId && swipe.memberId === memberId)
      .map((swipe) => swipe.placeId);
  },

  async saveSwipeAndSyncMatch({ roomId, memberId, placeId, choice, now }) {
    const { swipes, matches, members, rooms } = getMemoryStore();
    swipes.set(`${memberId}:${placeId}`, { roomId, memberId, placeId, choice });

    const matchKey = `${roomId}:${placeId}`;
    const existing = matches.get(matchKey);

    if (choice === "nope") {
      if (existing?.status === "open") matches.delete(matchKey);
      return { matchId: null, isNewMatch: false };
    }

    const room = rooms.get(roomId);
    const roomType = room?.roomType ?? "couple";
    const activeMembers = [...members.values()].filter(
      (m) => m.roomId === roomId && !m.revokedAt
    );
    const totalActive = activeMembers.length;

    // Đếm số lượt like của thành viên active cho địa điểm này
    const likesCount = [...swipes.values()].filter(
      (s) =>
        s.roomId === roomId &&
        s.placeId === placeId &&
        s.choice === "like" &&
        !members.get(s.memberId)?.revokedAt
    ).length;

    // Ngưỡng cần để match:
    // - Couple: cần 2 lượt like (cả 2 người)
    // - Group: cần >= 50% số thành viên active (tối thiểu 2)
    const threshold = roomType === "group" ? Math.max(2, Math.ceil(totalActive * 0.5)) : 2;

    if (likesCount < threshold) {
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
