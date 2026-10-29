import { getMemoryStore } from "@/server/db/demo/memory-store";
import { MAX_ROOM_MEMBERS } from "@/lib/constants/user";
import type { Room, RoomMember } from "@/server/db/schema";
import type { MemberSession, NewMemberRecord, RoomRepository } from "@/server/db/repositories/types";

function toMemberEntity(roomId: string, member: NewMemberRecord, now: Date): RoomMember {
  return {
    id: member.id,
    roomId,
    sessionHash: member.sessionHash,
    recoveryHash: member.recoveryHash,
    nickname: member.nickname,
    role: member.role,
    pushSubscription: null,
    lastSeenAt: now,
    revokedAt: null,
    createdAt: now,
  };
}

function findActiveMember(predicate: (member: RoomMember) => boolean): MemberSession | null {
  const { members, rooms } = getMemoryStore();
  for (const member of members.values()) {
    if (member.revokedAt || !predicate(member)) continue;
    const room = rooms.get(member.roomId);
    if (!room || room.status === "deleted") continue;
    return { memberId: member.id, roomId: member.roomId, role: member.role, nickname: member.nickname };
  }
  return null;
}

function isInviteFor(room: Room, inviteHash: string, now: Date): boolean {
  const matchesHash = room.inviteHash === inviteHash || room.inviteCodeHash === inviteHash;
  return matchesHash && room.status !== "deleted" && !!room.inviteExpiresAt && room.inviteExpiresAt > now;
}

export const memoryRoomRepository: RoomRepository = {
  async createRoomWithCreator(roomId, creator, now) {
    const { rooms, members } = getMemoryStore();
    rooms.set(roomId, {
      id: roomId,
      name: null,
      memberCount: 1,
      inviteHash: null,
      inviteCodeHash: null,
      inviteExpiresAt: null,
      anniversaryDate: null,
      status: "solo",
      roomType: "couple",
      maxMembers: 2,
      storageQuotaBytes: 26214400,
      storageUsedBytes: 0,
      photoCount: 0,
      maxPhotos: 50,
      version: 1,
      consentVersion: null,
      consentAt: null,
      pendingDeletedAt: null,
      lastActiveAt: now,
      createdAt: now,
      updatedAt: now,
    });
    members.set(creator.id, toMemberEntity(roomId, creator, now));
  },

  async findMemberBySessionHash(sessionHash) {
    return findActiveMember((member) => member.sessionHash === sessionHash);
  },

  async findMemberByRecoveryHash(recoveryHash) {
    return findActiveMember((member) => member.recoveryHash === recoveryHash);
  },

  async updateMemberCredentials(memberId, credentials, now) {
    const member = getMemoryStore().members.get(memberId);
    if (!member) return;
    Object.assign(member, credentials, { lastSeenAt: now });
  },

  async updateMemberNickname(roomId, memberId, nickname) {
    const member = getMemoryStore().members.get(memberId);
    if (member?.roomId === roomId) member.nickname = nickname;
  },

  async updateRoomProfile(roomId, profile, now) {
    const room = getMemoryStore().rooms.get(roomId);
    if (room) Object.assign(room, profile, { updatedAt: now });
  },

  async getRoomOverview(roomId) {
    const { rooms, members } = getMemoryStore();
    const room = rooms.get(roomId);
    if (!room || room.status === "deleted") return null;

    const activeMembers = [...members.values()]
      .filter((member) => member.roomId === roomId && !member.revokedAt)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map(({ id, nickname, role, lastSeenAt, createdAt }) => ({ id, nickname, role, lastSeenAt, createdAt }));

    return {
      id: room.id,
      name: room.name,
      memberCount: room.memberCount,
      status: room.status,
      anniversaryDate: room.anniversaryDate,
      inviteExpiresAt: room.inviteExpiresAt,
      roomType: room.roomType,
      maxMembers: room.maxMembers,
      storageQuotaBytes: room.storageQuotaBytes,
      storageUsedBytes: room.storageUsedBytes,
      photoCount: room.photoCount,
      maxPhotos: room.maxPhotos,
      version: room.version,
      consentVersion: room.consentVersion,
      consentAt: room.consentAt,
      pendingDeletedAt: room.pendingDeletedAt,
      members: activeMembers,
    };
  },

  async saveInvite(roomId, invite, now) {
    const room = getMemoryStore().rooms.get(roomId);
    if (!room) return;
    Object.assign(room, {
      inviteHash: invite.tokenHash,
      inviteCodeHash: invite.codeHash,
      inviteExpiresAt: invite.expiresAt,
      updatedAt: now,
    });
  },

  async findRoomIdByInvite(inviteHash, now) {
    for (const room of getMemoryStore().rooms.values()) {
      if (isInviteFor(room, inviteHash, now)) return room.id;
    }
    return null;
  },

  async joinRoomByInvite(roomId, inviteHash, partner, now) {
    const { rooms, members } = getMemoryStore();
    const room = rooms.get(roomId);
    if (!room || !isInviteFor(room, inviteHash, now) || room.memberCount >= (room.maxMembers ?? MAX_ROOM_MEMBERS)) return false;

    Object.assign(room, {
      memberCount: room.memberCount + 1,
      status: "paired",
      inviteHash: null,
      inviteCodeHash: null,
      inviteExpiresAt: null,
      lastActiveAt: now,
      updatedAt: now,
    });
    members.set(partner.id, toMemberEntity(roomId, partner, now));
    return true;
  },

  async revokeMember(roomId, memberId, now) {
    const { rooms, members } = getMemoryStore();
    const member = members.get(memberId);
    const room = rooms.get(roomId);
    if (!member || !room || member.roomId !== roomId || member.revokedAt) return false;

    member.revokedAt = now;
    Object.assign(room, { memberCount: Math.max(room.memberCount - 1, 0), status: "solo", updatedAt: now });
    return true;
  },

  async deleteRoomCascade(roomId) {
    const store = getMemoryStore();
    const roomMemberIds = new Set([...store.members.values()].filter((m) => m.roomId === roomId).map((m) => m.id));

    for (const plan of [...store.plans.values()].filter((p) => p.roomId === roomId)) {
      store.plans.delete(plan.id);
      store.stopsByPlan.delete(plan.id);
      store.checklistByPlan.delete(plan.id);
    }
    for (const [key, swipe] of store.swipes) if (swipe.roomId === roomId) store.swipes.delete(key);
    for (const [key, match] of store.matches) if (match.roomId === roomId) store.matches.delete(key);
    for (const [id, note] of store.memoryNotes) if (note.roomId === roomId) store.memoryNotes.delete(id);
    for (const memberId of roomMemberIds) {
      store.savedByMember.delete(memberId);
      store.members.delete(memberId);
    }
    store.rooms.delete(roomId);
  },
};
