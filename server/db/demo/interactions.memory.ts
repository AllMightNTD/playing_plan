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
    const { swipes, matches, members } = getMemoryStore();
    swipes.set(`${memberId}:${placeId}`, { roomId, memberId, placeId, choice });

    const matchKey = `${roomId}:${placeId}`;
    const existing = matches.get(matchKey);

    if (choice === "nope") {
      if (existing?.status === "open") matches.delete(matchKey);
      return null;
    }

    const partnerLiked = [...swipes.values()].some(
      (swipe) =>
        swipe.roomId === roomId &&
        swipe.placeId === placeId &&
        swipe.choice === "like" &&
        swipe.memberId !== memberId &&
        !members.get(swipe.memberId)?.revokedAt
    );
    if (!partnerLiked) return null;

    if (existing) {
      if (existing.status === "dismissed") existing.status = "open";
      return existing.id;
    }

    const match = { id: nanoid(21), roomId, placeId, matchedAt: now, status: "open" as const };
    matches.set(matchKey, match);
    return match.id;
  },

  async listMatches(roomId) {
    return [...getMemoryStore().matches.values()]
      .filter((match) => match.roomId === roomId && match.status !== "dismissed")
      .sort((a, b) => b.matchedAt.getTime() - a.matchedAt.getTime())
      .map(({ id, placeId, matchedAt, status }) => ({ id, placeId, matchedAt, status }));
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
