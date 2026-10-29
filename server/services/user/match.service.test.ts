import { beforeEach, describe, expect, it } from "vitest";
import { resetMemoryStore } from "@/server/db/demo/memory-store";
import { AppError, ERRORS } from "@/server/http/errors";
import { createInvite, ensureRoomSession, joinRoom, revokeRoomMember } from "./room.service";
import { getSwipeDeck, listMatches, recordSwipe } from "./match.service";
import { listSavedPlaces, savePlace, unsavePlace } from "./saved.service";

let ipCounter = 0;
const nextIp = () => `10.2.0.${++ipCounter}`;

async function createCouple() {
  const creator = (await ensureRoomSession(null, nextIp())).session;
  const invite = await createInvite(creator);
  const partner = (await joinRoom(null, { token: invite.token }, nextIp())).session;
  return { creator, partner };
}

beforeEach(() => resetMemoryStore());

describe("match (F07)", () => {
  it("should create a match only when both members like the same place", async () => {
    const { creator, partner } = await createCouple();

    expect((await recordSwipe(creator, "p1", "like")).matched).toBe(false);
    expect(await listMatches(partner)).toEqual([]);

    const result = await recordSwipe(partner, "p1", "like");
    expect(result.matched).toBe(true);

    const matches = await listMatches(creator);
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({ id: result.matchId, place: { id: "p1" } });
  });

  it("should keep the same match id when liking again", async () => {
    const { creator, partner } = await createCouple();
    await recordSwipe(creator, "p1", "like");
    const first = await recordSwipe(partner, "p1", "like");
    const again = await recordSwipe(creator, "p1", "like");
    expect(again.matchId).toBe(first.matchId);
  });

  it("should remove an open match when someone changes their mind", async () => {
    const { creator, partner } = await createCouple();
    await recordSwipe(creator, "p1", "like");
    await recordSwipe(partner, "p1", "like");
    await recordSwipe(creator, "p1", "nope");
    expect(await listMatches(partner)).toEqual([]);
  });

  it("should ignore likes from a revoked partner", async () => {
    const { creator, partner } = await createCouple();
    await recordSwipe(partner, "p1", "like");
    await revokeRoomMember(creator, partner.memberId);
    expect((await recordSwipe(creator, "p1", "like")).matched).toBe(false);
  });

  it("should not leak likes across rooms", async () => {
    const coupleA = await createCouple();
    const coupleB = await createCouple();
    await recordSwipe(coupleA.creator, "p1", "like");
    expect((await recordSwipe(coupleB.creator, "p1", "like")).matched).toBe(false);
  });

  it("should exclude swiped places from the deck", async () => {
    const { creator } = await createCouple();
    await recordSwipe(creator, "p1", "nope");
    const deck = await getSwipeDeck(creator, 50);
    expect(deck.some((place) => place.id === "p1")).toBe(false);
    expect(deck.length).toBeGreaterThan(0);
  });

  it("should reject swiping an unknown place", async () => {
    const { creator } = await createCouple();
    await expect(recordSwipe(creator, "unknown", "like")).rejects.toSatisfy(
      (error) => error instanceof AppError && error.definition.code === ERRORS.PLACE.NOT_FOUND.code
    );
  });
  it("should create a room notice when a new match is formed", async () => {
    const { creator, partner } = await createCouple();
    await recordSwipe(creator, "p1", "like");
    const swipeResult = await recordSwipe(partner, "p1", "like");
    expect(swipeResult.isNewMatch).toBe(true);

    const { getUserRepositories } = await import("@/server/db/repositories");
    const notices = await getUserRepositories().notices.listNotices(creator.roomId);
    expect(notices).toHaveLength(1);
    expect(notices[0]).toMatchObject({
      noticeType: "new_match",
      title: expect.stringContaining("Match mới"),
    });
  });

  it("should support group room matching with majority >= 50% rule", async () => {
    const { getMemoryStore } = await import("@/server/db/demo/memory-store");
    const creator = (await ensureRoomSession(null, nextIp())).session;
    const room = getMemoryStore().rooms.get(creator.roomId)!;
    room.roomType = "group";
    room.maxMembers = 5;

    // Thêm 3 thành viên nữa (tổng 4 thành viên)
    const m2 = (await joinRoom(null, { token: (await createInvite(creator)).token }, nextIp())).session;
    const m3 = (await joinRoom(null, { token: (await createInvite(creator)).token }, nextIp())).session;
    const m4 = (await joinRoom(null, { token: (await createInvite(creator)).token }, nextIp())).session;

    // Với 4 thành viên, ngưỡng 50% là 2 like
    const r1 = await recordSwipe(creator, "p1", "like");
    expect(r1.matched).toBe(false);

    const r2 = await recordSwipe(m2, "p1", "like");
    expect(r2.matched).toBe(true);
    expect(r2.isNewMatch).toBe(true);

    // Thành viên m3 like tiếp -> match vẫn mở
    const r3 = await recordSwipe(m3, "p1", "like");
    expect(r3.matched).toBe(true);
    expect(r3.isNewMatch).toBe(false);
  });

  it("should compute ETag and return notModified when ETag matches", async () => {
    const { creator, partner } = await createCouple();
    await recordSwipe(creator, "p1", "like");
    await recordSwipe(partner, "p1", "like");

    const { listMatchesWithEtag, markMatchAsSeen } = await import("./match.service");
    const res1 = await listMatchesWithEtag(creator);
    expect(res1.notModified).toBe(false);
    expect(res1.items).toHaveLength(1);
    expect(res1.items[0].isSeen).toBe(false);
    expect(res1.etag).toMatch(/^W\/"matches-/);

    // Gửi If-None-Match với cùng ETag -> 304 not modified
    const res2 = await listMatchesWithEtag(creator, res1.etag);
    expect(res2.notModified).toBe(true);
    expect(res2.items).toHaveLength(0);

    // Đánh dấu đã xem -> ETag đổi (vì unseenCount giảm)
    await markMatchAsSeen(creator, res1.items[0].id);
    const res3 = await listMatchesWithEtag(creator, res1.etag);
    expect(res3.notModified).toBe(false);
    expect(res3.items[0].isSeen).toBe(true);
    expect(res3.etag).not.toBe(res1.etag);
  });

  it("should prevent User from Room B from marking Room A match as seen", async () => {
    const coupleA = await createCouple();
    const coupleB = await createCouple();
    await recordSwipe(coupleA.creator, "p1", "like");
    const matchA = await recordSwipe(coupleA.partner, "p1", "like");

    const { markMatchAsSeen } = await import("./match.service");
    const markedByB = await markMatchAsSeen(coupleB.creator, matchA.matchId!);
    expect(markedByB).toBe(false);
  });
});

describe("saved places", () => {
  it("should save idempotently, list newest first and unsave", async () => {
    const { creator } = await createCouple();
    await savePlace(creator, "p1");
    await savePlace(creator, "p1");
    expect((await listSavedPlaces(creator)).map((p) => p.id)).toEqual(["p1"]);

    await unsavePlace(creator, "p1");
    expect(await listSavedPlaces(creator)).toEqual([]);
    expect(await listSavedPlaces(null)).toEqual([]);
  });
});
