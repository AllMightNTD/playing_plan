import { getUserRepositories } from "@/server/db/repositories";
import { getAllPublishedPlaces, requirePublishedPlace } from "@/server/services/user/places.service";
import type { HanoiPlace } from "@/lib/types/catalog";
import type { MatchRecord, MemberSession } from "@/server/db/repositories/types";
import type { SwipeChoice } from "@/lib/constants/user";

export interface MatchDto {
  id: string;
  matchedAt: Date;
  status: MatchRecord["status"];
  place: HanoiPlace;
}

export interface SwipeResultDto {
  matched: boolean;
  matchId: string | null;
}

/** F07: bộ thẻ là catalog đang xuất bản trừ các nơi người này đã vuốt. */
export async function getSwipeDeck(session: MemberSession | null, limit: number): Promise<HanoiPlace[]> {
  const places = await getAllPublishedPlaces();
  if (!session) return places.slice(0, limit);

  const swiped = new Set(await getUserRepositories().swipes.listSwipedPlaceIds(session.roomId, session.memberId));
  return places.filter((place) => !swiped.has(place.id)).slice(0, limit);
}

export async function recordSwipe(session: MemberSession, placeId: string, choice: SwipeChoice): Promise<SwipeResultDto> {
  await requirePublishedPlace(placeId);
  const matchId = await getUserRepositories().swipes.saveSwipeAndSyncMatch({
    roomId: session.roomId,
    memberId: session.memberId,
    placeId,
    choice,
    now: new Date(),
  });
  return { matched: matchId !== null, matchId };
}

/** Ghép Match với catalog; nơi đã bị gỡ xuất bản thì không hiện nữa. */
export async function listMatches(session: MemberSession | null): Promise<MatchDto[]> {
  if (!session) return [];
  const [matches, places] = await Promise.all([
    getUserRepositories().swipes.listMatches(session.roomId),
    getAllPublishedPlaces(),
  ]);
  const placeById = new Map(places.map((place) => [place.id, place]));

  return matches.flatMap((match) => {
    const place = placeById.get(match.placeId);
    return place ? [{ id: match.id, matchedAt: match.matchedAt, status: match.status, place }] : [];
  });
}
