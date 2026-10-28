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
