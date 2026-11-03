import { beforeEach, describe, expect, it } from "vitest";
import { getMemoryStore, resetMemoryStore } from "@/server/db/demo/memory-store";
import { getUserRepositories } from "@/server/db/repositories";
import { hashSecret } from "@/server/auth/secrets";
import { AppError, ERRORS } from "@/server/http/errors";
import {
  createInvite,
  deleteRoom,
  ensureRoomSession,
  getRoomProfile,
  joinRoom,
  leaveRoom,
  recoverSession,
  revokeRoomMember,
  rotateRecoveryKey,
  recordRoomConsent,
  requestSoftDelete,
  restoreSoftDelete,
  checkRoomConflict,
} from "./room.service";
import { createPlan, listPlans } from "./plan.service";

let ipCounter = 0;
const nextIp = () => `10.0.0.${++ipCounter}`;

async function expectAppError(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toSatisfy((error) => error instanceof AppError && error.definition.code === code);
}

async function createPairedRoom() {
  const creator = await ensureRoomSession(null, nextIp(), "Dũng");
  const invite = await createInvite(creator.session);
  const partner = await joinRoom(null, { token: invite.token, nickname: "Linh" }, nextIp());
  return { creator, partner, invite };
}

beforeEach(() => resetMemoryStore());

describe("ensureRoomSession", () => {
  it("should create a solo room with session token and recovery key on first write", async () => {
    const result = await ensureRoomSession(null, nextIp(), "Dũng");
    expect(result.issued?.sessionToken).toBeTruthy();
    expect(result.issued?.recoveryKey).toBeTruthy();

    const profile = await getRoomProfile(result.session);
    expect(profile.room.status).toBe("solo");
    expect(profile.members).toHaveLength(1);
    expect(profile.me).toMatchObject({ nickname: "Dũng", role: "creator" });
  });

  it("should reuse the existing session instead of creating another room", async () => {
    const first = await ensureRoomSession(null, nextIp());
    const second = await ensureRoomSession(first.session, nextIp());
    expect(second.issued).toBeNull();
    expect(second.session.roomId).toBe(first.session.roomId);
  });

  it("should store only hashes of issued secrets", async () => {
    const { issued } = await ensureRoomSession(null, nextIp());
    const { rooms } = getUserRepositories();
    expect(await rooms.findMemberBySessionHash(issued!.sessionToken)).toBeNull();
    expect(await rooms.findMemberBySessionHash(hashSecret(issued!.sessionToken))).not.toBeNull();
  });
});

describe("joinRoom", () => {
  it("should pair two devices via invite token", async () => {
    const { creator, partner } = await createPairedRoom();
    expect(partner.session.roomId).toBe(creator.session.roomId);
    expect(partner.session.role).toBe("partner");

    const profile = await getRoomProfile(creator.session);
    expect(profile.room.status).toBe("paired");
    expect(profile.members.map((m) => m.nickname)).toEqual(["Dũng", "Linh"]);
  });

  it("should accept the 8-char code case-insensitively with separators", async () => {
    const creator = await ensureRoomSession(null, nextIp());
    const invite = await createInvite(creator.session);
    const typed = `${invite.code.slice(0, 4).toLowerCase()}-${invite.code.slice(4)}`;
    const partner = await joinRoom(null, { code: typed }, nextIp());
    expect(partner.session.roomId).toBe(creator.session.roomId);
  });

  it("should reject reusing a consumed invite with the generic invalid error", async () => {
    const { invite } = await createPairedRoom();
    await expectAppError(joinRoom(null, { token: invite.token }, nextIp()), ERRORS.ROOM.INVITE_INVALID.code);
  });

  it("should invalidate the previous invite when a new one is created", async () => {
    const creator = await ensureRoomSession(null, nextIp());
    const oldInvite = await createInvite(creator.session);
    await createInvite(creator.session);
    await expectAppError(joinRoom(null, { token: oldInvite.token }, nextIp()), ERRORS.ROOM.INVITE_INVALID.code);
  });

  it("should reject the creator joining their own room", async () => {
    const creator = await ensureRoomSession(null, nextIp());
    const invite = await createInvite(creator.session);
    await expectAppError(joinRoom(creator.session, { token: invite.token }, nextIp()), ERRORS.ROOM.ALREADY_IN_ROOM.code);
  });

  it("should reject a device that is already in a paired room", async () => {
    const { partner } = await createPairedRoom();
    const other = await ensureRoomSession(null, nextIp());
    const invite = await createInvite(other.session);
    await expectAppError(joinRoom(partner.session, { token: invite.token }, nextIp()), ERRORS.ROOM.ALREADY_IN_ROOM.code);
  });

  it("should refuse to create an invite once the room is full", async () => {
    const { creator } = await createPairedRoom();
    await expectAppError(createInvite(creator.session), ERRORS.ROOM.ALREADY_PAIRED.code);
  });

  it("should let only one of two concurrent joins win (atomic join)", async () => {
    const creator = await ensureRoomSession(null, nextIp());
    const invite = await createInvite(creator.session);
    const results = await Promise.allSettled([
      joinRoom(null, { token: invite.token }, nextIp()),
      joinRoom(null, { code: invite.code }, nextIp()),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await getRoomProfile(creator.session)).members).toHaveLength(2);
  });

  it("should block an IP after 5 wrong codes even when the 6th code is right", async () => {
    const creator = await ensureRoomSession(null, nextIp());
    const invite = await createInvite(creator.session);
    const attackerIp = nextIp();
    for (let attempt = 0; attempt < 5; attempt++) {
      await expectAppError(joinRoom(null, { code: "ZZZZZZZZ" }, attackerIp), ERRORS.ROOM.INVITE_INVALID.code);
    }
    await expectAppError(joinRoom(null, { code: invite.code }, attackerIp), ERRORS.COMMON.RATE_LIMITED.code);
  });
});

describe("leave, revoke and delete", () => {
  it("should let the partner leave and return the room to solo", async () => {
    const { creator, partner } = await createPairedRoom();
    await leaveRoom(partner.session);

    const profile = await getRoomProfile(creator.session);
    expect(profile.room.status).toBe("solo");
    expect(profile.members).toHaveLength(1);
    expect(await getUserRepositories().rooms.findMemberBySessionHash(hashSecret(partner.issued!.sessionToken))).toBeNull();
  });

  it("should delete the whole room when the last member leaves", async () => {
    const creator = await ensureRoomSession(null, nextIp());
    await createPlan(creator.session, { title: "Hồ Tây", planDate: "2026-11-01", startTime: "16:30" });
    await leaveRoom(creator.session);

    expect(await getUserRepositories().rooms.getRoomOverview(creator.session.roomId)).toBeNull();
    expect(await listPlans(creator.session)).toEqual([]);
  });

  it("should revoke the partner device but not self", async () => {
    const { creator, partner } = await createPairedRoom();
    await expectAppError(revokeRoomMember(creator.session, creator.session.memberId), ERRORS.ROOM.CANNOT_REVOKE_SELF.code);

    await revokeRoomMember(creator.session, partner.session.memberId);
    await expectAppError(revokeRoomMember(creator.session, partner.session.memberId), ERRORS.ROOM.MEMBER_NOT_FOUND.code);
  });

  it("should not revoke a member of another room", async () => {
    const { creator } = await createPairedRoom();
    const stranger = await ensureRoomSession(null, nextIp());
    await expectAppError(revokeRoomMember(stranger.session, creator.session.memberId), ERRORS.ROOM.MEMBER_NOT_FOUND.code);
  });

  it("should hard-delete room data and cascade delete all child entities", async () => {
    const { creator, partner } = await createPairedRoom();
    const store = getMemoryStore();

    // Populate child entities for the room
    store.notices.set("n1", {
      id: "n1",
      roomId: creator.session.roomId,
      memberId: creator.session.memberId,
      noticeType: "new_match",
      title: "Test",
      content: "Test",
      metadata: null,
      readAt: null,
      createdAt: new Date(),
    });
    store.uploads.set("u1", {
      id: "u1",
      roomId: creator.session.roomId,
      memberId: creator.session.memberId,
      memoryId: null,
      fileName: "test.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 1000,
      width: 100,
      height: 100,
      relativePath: "rooms/r1/test.jpg",
      createdAt: new Date(),
      deletedAt: null,
    });
    store.placeCheckins.set("c1", {
      id: "c1",
      roomId: creator.session.roomId,
      memberId: creator.session.memberId,
      placeId: "p1",
      placeName: "Test Cafe",
      district: "Ba Dinh",
      method: "gps_auto",
      checkedInAt: new Date(),
    });
    store.blindDateTickets.set("b1", {
      id: "b1",
      roomId: creator.session.roomId,
      budgetTier: "medium",
      currentStep: 1,
      totalSteps: 3,
      status: "in_progress",
      steps: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    store.secretNotes.set("s1", {
      id: "s1",
      roomId: creator.session.roomId,
      authorMemberId: creator.session.memberId,
      placeId: "p1",
      placeName: "Test Place",
      district: "Ba Dinh",
      hint: "hint",
      content: "secret",
      isUnlocked: false,
      unlockedAt: null,
      createdAt: new Date(),
    });
    store.rsvps.set("r1", {
      id: "r1",
      planId: "plan1",
      roomId: creator.session.roomId,
      responderName: "Partner",
      status: "confirmed",
      changeNote: null,
      createdAt: new Date(),
    });

    await deleteRoom(creator.session);

    expect(await getUserRepositories().rooms.findMemberBySessionHash(hashSecret(partner.issued!.sessionToken))).toBeNull();
    expect(store.rooms.has(creator.session.roomId)).toBe(false);
    expect(store.notices.has("n1")).toBe(false);
    expect(store.uploads.has("u1")).toBe(false);
    expect(store.placeCheckins.has("c1")).toBe(false);
    expect(store.blindDateTickets.has("b1")).toBe(false);
    expect(store.secretNotes.has("s1")).toBe(false);
    expect(store.rsvps.has("r1")).toBe(false);
  });
});

describe("recoverSession", () => {
  it("should issue a new session token and invalidate the old one", async () => {
    const original = await ensureRoomSession(null, nextIp());
    const recovered = await recoverSession(original.issued!.recoveryKey!, nextIp());
    const { rooms } = getUserRepositories();

    expect(recovered.session.memberId).toBe(original.session.memberId);
    expect(await rooms.findMemberBySessionHash(hashSecret(recovered.issued!.sessionToken))).not.toBeNull();
    expect(await rooms.findMemberBySessionHash(hashSecret(original.issued!.sessionToken))).toBeNull();
  });

  it("should reject an old recovery key after rotation", async () => {
    const original = await ensureRoomSession(null, nextIp());
    const newKey = await rotateRecoveryKey(original.session);

    await expectAppError(recoverSession(original.issued!.recoveryKey!, nextIp()), ERRORS.ROOM.RECOVERY_INVALID.code);
    expect((await recoverSession(newKey, nextIp())).session.memberId).toBe(original.session.memberId);
  });

  it("should automatically rotate recovery key on recovery so old key cannot be reused", async () => {
    const original = await ensureRoomSession(null, nextIp());
    const oldKey = original.issued!.recoveryKey!;
    const recovered = await recoverSession(oldKey, nextIp());

    expect(recovered.issued?.recoveryKey).toBeTruthy();
    expect(recovered.issued?.recoveryKey).not.toBe(oldKey);

    // Khóa cũ phải bị từ chối ngay lập tức
    await expectAppError(recoverSession(oldKey, nextIp()), ERRORS.ROOM.RECOVERY_INVALID.code);

    // Khóa mới xoay hoạt động chuẩn
    const secondRecovery = await recoverSession(recovered.issued!.recoveryKey!, nextIp());
    expect(secondRecovery.session.memberId).toBe(original.session.memberId);
  });

  it("should reject recovery for a revoked device", async () => {
    const { creator, partner } = await createPairedRoom();
    await revokeRoomMember(creator.session, partner.session.memberId);
    await expectAppError(recoverSession(partner.issued!.recoveryKey!, nextIp()), ERRORS.ROOM.RECOVERY_INVALID.code);
  });
});

describe("recordRoomConsent (Decree 13/2023)", () => {
  it("should record consent version and timestamp in room profile", async () => {
    const user = await ensureRoomSession(null, nextIp());
    await recordRoomConsent(user.session, "2026.1");
    const profile = await getRoomProfile(user.session);
    expect(profile.room.consentVersion).toBe("2026.1");
    expect(profile.room.consentAt).toBeInstanceOf(Date);
  });
});

describe("soft-delete and restore (14 days)", () => {
  it("should set pendingDeletedAt on soft-delete request and clear it on restore", async () => {
    const user = await ensureRoomSession(null, nextIp());
    const requestedAt = await requestSoftDelete(user.session);
    expect(requestedAt).toBeInstanceOf(Date);

    let profile = await getRoomProfile(user.session);
    expect(profile.room.pendingDeletedAt).toEqual(requestedAt);

    await restoreSoftDelete(user.session);
    profile = await getRoomProfile(user.session);
    expect(profile.room.pendingDeletedAt).toBeNull();
  });
});

describe("checkRoomConflict", () => {
  it("should report hasData false for brand new empty solo room", async () => {
    const user = await ensureRoomSession(null, nextIp());
    const conflict = await checkRoomConflict(user.session.roomId);
    expect(conflict).toEqual({ isSolo: true, hasData: false });
  });

  it("should report hasData true once user created a plan", async () => {
    const user = await ensureRoomSession(null, nextIp());
    await createPlan(user.session, { title: "Cà phê Hồ Tây", planDate: "2026-11-01", startTime: "16:00" });
    const conflict = await checkRoomConflict(user.session.roomId);
    expect(conflict).toEqual({ isSolo: true, hasData: true });
  });
});
