import { getUserRepositories } from "@/server/db/repositories";
import { getAllPublishedPlaces, requirePublishedPlace } from "@/server/services/user/places.service";
import type { HanoiPlace } from "@/lib/types/catalog";
import type { MemberSession } from "@/server/db/repositories/types";

/** Chưa có phiên thì danh sách đã lưu nằm ở localStorage phía client (mục 0.2), server trả rỗng. */
export async function listSavedPlaces(session: MemberSession | null): Promise<HanoiPlace[]> {
  if (!session) return [];
  const [placeIds, places] = await Promise.all([
    getUserRepositories().saved.listPlaceIds(session.memberId),
    getAllPublishedPlaces(),
  ]);
  const placeById = new Map(places.map((place) => [place.id, place]));
  return placeIds.flatMap((placeId) => placeById.get(placeId) ?? []);
}

export async function savePlace(session: MemberSession, placeIdOrSlug: string): Promise<void> {
  const place = await requirePublishedPlace(placeIdOrSlug);
  await getUserRepositories().saved.save(session.memberId, place.id, new Date());
}

export async function unsavePlace(session: MemberSession, placeIdOrSlug: string): Promise<void> {
  const place = await requirePublishedPlace(placeIdOrSlug).catch(() => null);
  const targetId = place ? place.id : placeIdOrSlug;
  await getUserRepositories().saved.remove(session.memberId, targetId);
}
