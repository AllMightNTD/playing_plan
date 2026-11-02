import { nanoid } from "nanoid";
import { getUserRepositories } from "@/server/db/repositories";
import {
  getPublishedPlacesByIds,
  getUnswipedPublishedPlaces,
  requirePublishedPlace,
} from "@/server/services/user/places.service";
import type { HanoiPlace } from "@/lib/types/catalog";
import type { MatchRecord, MemberSession } from "@/server/db/repositories/types";
import type { SwipeChoice } from "@/lib/constants/user";
import { AppError, ERRORS } from "@/server/http/errors";

export interface MatchDto {
  id: string;
  matchedAt: Date;
  status: MatchRecord["status"];
  isSeen: boolean;
  place: HanoiPlace;
}

export interface SwipeResultDto {
  matched: boolean;
  matchId: string | null;
  isNewMatch: boolean;
}

export interface UndoSwipeDto {
  placeId: string;
  removedMatchId: string | null;
}

export interface MatchesEtagResult {
  notModified: boolean;
  etag: string;
  items: MatchDto[];
}

export function computeMatchesEtag(roomId: string, rawMatches: MatchRecord[]): string {
  const latestTs = rawMatches.reduce(
    (max, m) => Math.max(max, m.matchedAt ? new Date(m.matchedAt).getTime() : 0),
    0
  );
  const unseenCount = rawMatches.filter((m) => !m.isSeen).length;
  const plannedCount = rawMatches.filter((m) => m.status === "planned").length;
  return `W/"matches-${roomId}-${rawMatches.length}-${latestTs}-${unseenCount}-${plannedCount}"`;
}

export async function getSwipeDeck(
  session: MemberSession | null,
  limit: number,
  hobby?: string
): Promise<HanoiPlace[]> {
  return getUnswipedPublishedPlaces(session, limit, hobby);
}

export async function undoSwipe(session: MemberSession, placeId: string): Promise<UndoSwipeDto> {
  const result = await getUserRepositories().swipes.undoSwipe({
    roomId: session.roomId,
    memberId: session.memberId,
    placeId,
  });
  if (result.status === "not_found") throw new AppError(ERRORS.SWIPE.NOT_FOUND);
  if (result.status === "match_planned") throw new AppError(ERRORS.SWIPE.MATCH_PLANNED);
  return { placeId, removedMatchId: result.removedMatchId };
}

export async function recordSwipe(
  session: MemberSession,
  placeId: string,
  choice: SwipeChoice
): Promise<SwipeResultDto> {
  const place = await requirePublishedPlace(placeId);
  const now = new Date();
  const syncResult = await getUserRepositories().swipes.saveSwipeAndSyncMatch({
    roomId: session.roomId,
    memberId: session.memberId,
    placeId,
    choice,
    now,
  });

  if (syncResult.isNewMatch && syncResult.matchId) {
    try {
      await getUserRepositories().notices.insertNotice({
        id: nanoid(21),
        roomId: session.roomId,
        memberId: null,
        noticeType: "new_match",
        title: `🎉 Match mới: ${place.name}!`,
        content: `Cả hai đều đã thích "${place.name}". Lên kế hoạch hẹn hò ngay thôi!`,
        metadata: { matchId: syncResult.matchId, placeId, placeName: place.name },
        readAt: null,
        createdAt: now,
      });
    } catch {
      // Non-critical notice side-effect failure must not block swipe response
    }
  }

  return {
    matched: syncResult.matchId !== null,
    matchId: syncResult.matchId,
    isNewMatch: syncResult.isNewMatch,
  };
}

async function hydrateMatchRecords(rawMatches: MatchRecord[]): Promise<MatchDto[]> {
  if (rawMatches.length === 0) return [];
  const places = await getPublishedPlacesByIds(rawMatches.map((m) => m.placeId));
  const placeById = new Map(places.map((place) => [place.id, place]));

  return rawMatches.flatMap((match) => {
    const place = placeById.get(match.placeId);
    return place
      ? [
          {
            id: match.id,
            matchedAt: match.matchedAt,
            status: match.status,
            isSeen: match.isSeen,
            place,
          },
        ]
      : [];
  });
}

export async function listMatches(session: MemberSession | null): Promise<MatchDto[]> {
  if (!session) return [];
  const rawMatches = await getUserRepositories().swipes.listMatches(session.roomId);
  return hydrateMatchRecords(rawMatches);
}

export async function listMatchesWithEtag(
  session: MemberSession | null,
  ifNoneMatch?: string | null
): Promise<MatchesEtagResult> {
  if (!session) {
    return { notModified: false, etag: 'W/"empty"', items: [] };
  }

  const rawMatches = await getUserRepositories().swipes.listMatches(session.roomId);
  const etag = computeMatchesEtag(session.roomId, rawMatches);

  if (ifNoneMatch && ifNoneMatch === etag) {
    return { notModified: true, etag, items: [] };
  }

  const items = await hydrateMatchRecords(rawMatches);
  return { notModified: false, etag, items };
}

export async function markMatchAsSeen(session: MemberSession, matchId: string): Promise<boolean> {
  return getUserRepositories().swipes.markMatchSeen(session.roomId, matchId);
}
