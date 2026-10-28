import {
  and,
  asc,
  eq,
  gt,
  inArray,
  isNull,
  lt,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "@/server/db/client";
import {
  checklistItems,
  datePlans,
  matches,
  memories,
  memoryNotes,
  memoryPhotos,
  planStops,
  reminders,
  roomMembers,
  rooms,
  savedPlaces,
  swipes,
} from "@/server/db/schema";
import { MAX_ROOM_MEMBERS } from "@/lib/constants/user";
import type {
  MemberSession,
  NewMemberRecord,
  RoomRepository,
} from "@/server/db/repositories/types";

async function findActiveMember(condition: SQL): Promise<MemberSession | null> {
  const [member] = await db
    .select({
      memberId: roomMembers.id,
      roomId: roomMembers.roomId,
      role: roomMembers.role,
      nickname: roomMembers.nickname,
    })
    .from(roomMembers)
    .innerJoin(rooms, eq(roomMembers.roomId, rooms.id))
    .where(
      and(
        condition,
        isNull(roomMembers.revokedAt),
        ne(rooms.status, "deleted"),
      ),
    )
    .limit(1);
  return member ?? null;
}

function toMemberRow(roomId: string, member: NewMemberRecord, now: Date) {
  return {
    id: member.id,
    roomId,
    sessionHash: member.sessionHash,
    recoveryHash: member.recoveryHash,
    nickname: member.nickname,
    role: member.role,
    lastSeenAt: now,
    createdAt: now,
  };
}

/** Lời mời khớp khi trùng băm token (link/QR) hoặc băm mã 8 ký tự. */
function isInviteFor(inviteHash: string, now: Date): SQL | undefined {
  return and(
    or(eq(rooms.inviteHash, inviteHash), eq(rooms.inviteCodeHash, inviteHash)),
    gt(rooms.inviteExpiresAt, now),
    ne(rooms.status, "deleted"),
  );
}

export const drizzleRoomRepository: RoomRepository = {
  async createRoomWithCreator(roomId, creator, now) {
    await db.transaction(async (tx) => {
      await tx.insert(rooms).values({
        id: roomId,
        memberCount: 1,
        status: "solo",
        lastActiveAt: now,
        createdAt: now,
        updatedAt: now,
      });
      await tx.insert(roomMembers).values(toMemberRow(roomId, creator, now));
    });
  },

  findMemberBySessionHash: (sessionHash) =>
    findActiveMember(eq(roomMembers.sessionHash, sessionHash)),

  findMemberByRecoveryHash: (recoveryHash) =>
    findActiveMember(eq(roomMembers.recoveryHash, recoveryHash)),

  async updateMemberCredentials(memberId, credentials, now) {
    await db
      .update(roomMembers)
      .set({ ...credentials, lastSeenAt: now })
      .where(eq(roomMembers.id, memberId));
  },

  async updateMemberNickname(roomId, memberId, nickname) {
    await db
      .update(roomMembers)
      .set({ nickname })
      .where(and(eq(roomMembers.id, memberId), eq(roomMembers.roomId, roomId)));
  },

  async updateRoomProfile(roomId, profile, now) {
    await db
      .update(rooms)
      .set({ ...profile, updatedAt: now })
      .where(eq(rooms.id, roomId));
  },

  async getRoomOverview(roomId) {
    const [room] = await db
      .select({
        id: rooms.id,
        name: rooms.name,
        memberCount: rooms.memberCount,
        status: rooms.status,
        anniversaryDate: rooms.anniversaryDate,
        inviteExpiresAt: rooms.inviteExpiresAt,
      })
      .from(rooms)
      .where(and(eq(rooms.id, roomId), ne(rooms.status, "deleted")))
      .limit(1);
    if (!room) return null;

    const members = await db
      .select({
        id: roomMembers.id,
        nickname: roomMembers.nickname,
        role: roomMembers.role,
        lastSeenAt: roomMembers.lastSeenAt,
        createdAt: roomMembers.createdAt,
      })
      .from(roomMembers)
      .where(and(eq(roomMembers.roomId, roomId), isNull(roomMembers.revokedAt)))
      .orderBy(asc(roomMembers.createdAt));

    return { ...room, members };
  },

  async saveInvite(roomId, invite, now) {
    await db
      .update(rooms)
      .set({
        inviteHash: invite.tokenHash,
        inviteCodeHash: invite.codeHash,
        inviteExpiresAt: invite.expiresAt,
        updatedAt: now,
      })
      .where(eq(rooms.id, roomId));
  },

  async findRoomIdByInvite(inviteHash, now) {
    const [room] = await db
      .select({ id: rooms.id })
      .from(rooms)
      .where(isInviteFor(inviteHash, now))
      .limit(1);
    return room?.id ?? null;
  },

  async joinRoomByInvite(roomId, inviteHash, partner, now) {
    return db.transaction(async (tx) => {
      const result = await tx
        .update(rooms)
        .set({
          memberCount: sql`${rooms.memberCount} + 1`,
          status: "paired",
          inviteHash: null,
          inviteCodeHash: null,
          inviteExpiresAt: null,
          lastActiveAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(rooms.id, roomId),
            isInviteFor(inviteHash, now),
            lt(rooms.memberCount, MAX_ROOM_MEMBERS),
          ),
        );

      if (result.rowsAffected !== 1) return false;

      await tx.insert(roomMembers).values(toMemberRow(roomId, partner, now));
      return true;
    });
  },

  async revokeMember(roomId, memberId, now) {
    return db.transaction(async (tx) => {
      const result = await tx
        .update(roomMembers)
        .set({ revokedAt: now })
        .where(
          and(
            eq(roomMembers.id, memberId),
            eq(roomMembers.roomId, roomId),
            isNull(roomMembers.revokedAt),
          ),
        );

      if (result.rowsAffected !== 1) return false;

      await tx
        .update(rooms)
        .set({
          memberCount: sql`GREATEST(${rooms.memberCount} - 1, 0)`,
          status: "solo",
          updatedAt: now,
        })
        .where(eq(rooms.id, roomId));
      return true;
    });
  },

  async deleteRoomCascade(roomId) {
    await db.transaction(async (tx) => {
      const roomPlanIds = tx
        .select({ id: datePlans.id })
        .from(datePlans)
        .where(eq(datePlans.roomId, roomId));
      const roomMemoryIds = tx
        .select({ id: memories.id })
        .from(memories)
        .where(eq(memories.roomId, roomId));
      const roomMemberIds = tx
        .select({ id: roomMembers.id })
        .from(roomMembers)
        .where(eq(roomMembers.roomId, roomId));

      await tx
        .delete(checklistItems)
        .where(inArray(checklistItems.planId, roomPlanIds));
      await tx.delete(planStops).where(inArray(planStops.planId, roomPlanIds));
      await tx.delete(reminders).where(inArray(reminders.planId, roomPlanIds));
      await tx
        .delete(memoryPhotos)
        .where(inArray(memoryPhotos.memoryId, roomMemoryIds));
      await tx.delete(memories).where(eq(memories.roomId, roomId));
      await tx.delete(memoryNotes).where(eq(memoryNotes.roomId, roomId));
      await tx.delete(datePlans).where(eq(datePlans.roomId, roomId));
      await tx.delete(swipes).where(eq(swipes.roomId, roomId));
      await tx.delete(matches).where(eq(matches.roomId, roomId));
      await tx
        .delete(savedPlaces)
        .where(inArray(savedPlaces.memberId, roomMemberIds));
      await tx.delete(roomMembers).where(eq(roomMembers.roomId, roomId));
      await tx.delete(rooms).where(eq(rooms.id, roomId));
    });
  },
};
