import { nanoid } from "nanoid";
import { getUserRepositories } from "@/server/db/repositories";
import { getAllPublishedPlaces, requirePublishedPlace } from "@/server/services/user/places.service";
import { filterPlacesByHobby } from "@/lib/catalog/hobby-filter";
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

/**
 * Tính ETag cho danh sách Match của phòng dựa trên số lượng, thời gian cập nhật mới nhất và số match chưa đọc.
 */
export function computeMatchesEtag(roomId: string, rawMatches: MatchRecord[]): string {
  const latestTs = rawMatches.reduce((max, m) => Math.max(max, m.matchedAt ? new Date(m.matchedAt).getTime() : 0), 0);
  const unseenCount = rawMatches.filter((m) => !m.isSeen).length;
  // Đổi trạng thái (open ↔ planned) cũng phải làm đổi ETag, nếu không polling trả 304 và UI không cập nhật
  const plannedCount = rawMatches.filter((m) => m.status === "planned").length;
  return `W/"matches-${roomId}-${rawMatches.length}-${latestTs}-${unseenCount}-${plannedCount}"`;
}

/** F07: bộ thẻ là catalog đang xuất bản trừ các nơi người này đã vuốt, hỗ trợ lọc theo Hobby tag. */
export async function getSwipeDeck(session: MemberSession | null, limit: number, hobby?: string): Promise<HanoiPlace[]> {
  const places = await getAllPublishedPlaces();
  const filtered = filterPlacesByHobby(places, hobby);
  if (!session) return filtered.slice(0, limit);

  const swiped = new Set(await getUserRepositories().swipes.listSwipedPlaceIds(session.roomId, session.memberId));
  return filtered.filter((place) => !swiped.has(place.id)).slice(0, limit);
}

/** Hoàn tác lượt quẹt của chính mình; Match mất ngưỡng like thì bị gỡ theo. */
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

export async function recordSwipe(session: MemberSession, placeId: string, choice: SwipeChoice): Promise<SwipeResultDto> {
  const place = await requirePublishedPlace(placeId);
  const now = new Date();
  const syncResult = await getUserRepositories().swipes.saveSwipeAndSyncMatch({
    roomId: session.roomId,
    memberId: session.memberId,
    placeId,
    choice,
    now,
  });

  // Khi có match mới tạo, tự động bắn thông báo nội bộ vào room_notices
  if (syncResult.isNewMatch && syncResult.matchId) {
    try {
      await getUserRepositories().notices.insertNotice({
        id: nanoid(21),
        roomId: session.roomId,
        memberId: null, // Gửi cho toàn bộ thành viên trong phòng
        noticeType: "new_match",
        title: `🎉 Match mới: ${place.name}!`,
        content: `Cả hai đều đã thích "${place.name}". Lên kế hoạch hẹn hò ngay thôi!`,
        metadata: { matchId: syncResult.matchId, placeId, placeName: place.name },
        readAt: null,
        createdAt: now,
      });
    } catch {
      // Bỏ qua nếu lỗi notice phụ để không chặn luồng chính
    }
  }

  return {
    matched: syncResult.matchId !== null,
    matchId: syncResult.matchId,
    isNewMatch: syncResult.isNewMatch,
  };
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
    return place
      ? [{ id: match.id, matchedAt: match.matchedAt, status: match.status, isSeen: match.isSeen, place }]
      : [];
  });
}

/**
 * Lấy danh sách match hỗ trợ Short Polling ETag (RFC 7232).
 */
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

  const places = await getAllPublishedPlaces();
  const placeById = new Map(places.map((place) => [place.id, place]));

  const items = rawMatches.flatMap((match) => {
    const place = placeById.get(match.placeId);
    return place
      ? [{ id: match.id, matchedAt: match.matchedAt, status: match.status, isSeen: match.isSeen, place }]
      : [];
  });

  return { notModified: false, etag, items };
}

/** Đánh dấu match đã được xem để tắt badge thông báo. */
export async function markMatchAsSeen(session: MemberSession, matchId: string): Promise<boolean> {
  return getUserRepositories().swipes.markMatchSeen(session.roomId, matchId);
}
