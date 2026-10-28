import { nanoid } from "nanoid";
import { getUserRepositories } from "@/server/db/repositories";
import {
  generateInviteCode,
  generateSecret,
  hashSecret,
  INVITE_TOKEN_BYTES,
  normalizeInviteCode,
  RECOVERY_KEY_BYTES,
  SESSION_TOKEN_BYTES,
} from "@/server/auth/secrets";
import type { IssuedCredentials } from "@/server/auth/user-session";
import {
  assertWithinRateLimit,
  consumeRateLimit,
  RATE_LIMITS,
  recordRateLimitHit,
} from "@/server/http/rate-limit";
import { AppError, ERRORS } from "@/server/http/errors";
import { DEFAULT_NICKNAME, INVITE_TTL_MS, MAX_ROOM_MEMBERS } from "@/lib/constants/user";
import { omitUndefined } from "@/lib/utils";
import type { MemberRole, MemberSession, NewMemberRecord, RoomOverview } from "@/server/db/repositories/types";
import type { JoinRoomBody, UpdateMeBody } from "@/lib/validators/user";

export interface SessionResult {
  session: MemberSession;
  issued: IssuedCredentials | null;
}

export interface RoomProfileDto {
  me: { id: string; nickname: string | null; role: MemberRole };
  room: {
    id: string;
    name: string | null;
    status: RoomOverview["status"];
    anniversaryDate: string | null;
    memberCount: number;
    inviteExpiresAt: Date | null;
  };
  members: { id: string; nickname: string | null; role: MemberRole; isMe: boolean; lastSeenAt: Date }[];
}

export interface InviteDto {
  token: string;
  code: string;
  path: string;
  expiresAt: Date;
}

function issueMemberCredentials(role: MemberRole, nickname: string) {
  const sessionToken = generateSecret(SESSION_TOKEN_BYTES);
  const recoveryKey = generateSecret(RECOVERY_KEY_BYTES);
  const member: NewMemberRecord = {
    id: nanoid(21),
    sessionHash: hashSecret(sessionToken),
    recoveryHash: hashSecret(recoveryKey),
    nickname,
    role,
  };
  return { member, issued: { sessionToken, recoveryKey } };
}

function toSession(roomId: string, member: NewMemberRecord): MemberSession {
  return { roomId, memberId: member.id, role: member.role, nickname: member.nickname };
}

function toRoomProfileDto(session: MemberSession, room: RoomOverview): RoomProfileDto {
  const me = room.members.find((member) => member.id === session.memberId);
  return {
    me: { id: session.memberId, nickname: me?.nickname ?? session.nickname, role: session.role },
    room: {
      id: room.id,
      name: room.name,
      status: room.status,
      anniversaryDate: room.anniversaryDate,
      memberCount: room.members.length,
      inviteExpiresAt: room.inviteExpiresAt,
    },
    members: room.members.map((member) => ({
      id: member.id,
      nickname: member.nickname,
      role: member.role,
      isMe: member.id === session.memberId,
      lastSeenAt: member.lastSeenAt,
    })),
  };
}

async function loadRoomOrThrow(roomId: string): Promise<RoomOverview> {
  const room = await getUserRepositories().rooms.getRoomOverview(roomId);
  if (!room) throw new AppError(ERRORS.SESSION.UNAUTHORIZED);
  return room;
}

function toInviteHash(input: JoinRoomBody): string {
  return hashSecret(input.token ?? normalizeInviteCode(input.code ?? ""));
}

/** Mã sai và mã hết hạn trả cùng một lỗi, đồng thời đếm lượt sai để chặn dò mã (F02). */
function rejectInvite(clientIp: string): never {
  recordRateLimitHit(RATE_LIMITS.INVITE_FAILURE, clientIp);
  throw new AppError(ERRORS.ROOM.INVITE_INVALID);
}

/**
 * F01: tạo phòng ngầm cho lần ghi đầu tiên; đã có phiên thì dùng lại (idempotent).
 */
export async function ensureRoomSession(
  existing: MemberSession | null,
  clientIp: string,
  nickname: string = DEFAULT_NICKNAME
): Promise<SessionResult> {
  if (existing) return { session: existing, issued: null };

  consumeRateLimit(RATE_LIMITS.SESSION_CREATE, clientIp);
  const roomId = nanoid(21);
  const { member, issued } = issueMemberCredentials("creator", nickname);
  await getUserRepositories().rooms.createRoomWithCreator(roomId, member, new Date());
  return { session: toSession(roomId, member), issued };
}

export async function getRoomProfile(session: MemberSession): Promise<RoomProfileDto> {
  return toRoomProfileDto(session, await loadRoomOrThrow(session.roomId));
}

export async function updateRoomProfile(session: MemberSession, patch: UpdateMeBody): Promise<RoomProfileDto> {
  const { rooms } = getUserRepositories();
  const roomPatch = omitUndefined({ name: patch.roomName, anniversaryDate: patch.anniversaryDate });

  if (patch.nickname !== undefined) {
    await rooms.updateMemberNickname(session.roomId, session.memberId, patch.nickname);
  }
  if (Object.keys(roomPatch).length > 0) {
    await rooms.updateRoomProfile(session.roomId, roomPatch, new Date());
  }
  return getRoomProfile(session);
}

/**
 * F02: tạo lời mời mới (link 128 bit + mã 8 ký tự, dùng một lần, hạn 24 giờ); lời mời cũ bị vô hiệu.
 */
export async function createInvite(session: MemberSession): Promise<InviteDto> {
  const room = await loadRoomOrThrow(session.roomId);
  if (room.members.length >= MAX_ROOM_MEMBERS) throw new AppError(ERRORS.ROOM.ALREADY_PAIRED);

  const now = new Date();
  const token = generateSecret(INVITE_TOKEN_BYTES);
  const code = generateInviteCode();
  const expiresAt = new Date(now.getTime() + INVITE_TTL_MS);

  await getUserRepositories().rooms.saveInvite(
    session.roomId,
    { tokenHash: hashSecret(token), codeHash: hashSecret(code), expiresAt },
    now
  );
  return { token, code, path: `/r/${token}`, expiresAt };
}

/**
 * F02: vào phòng bằng link/QR hoặc mã. Thiết bị đang ở phòng đã ghép đôi phải rời phòng trước;
 * thiết bị đang ở phòng riêng (solo) thì phòng cũ được giữ nguyên, khôi phục lại được bằng khóa cũ.
 */
export async function joinRoom(existing: MemberSession | null, input: JoinRoomBody, clientIp: string): Promise<SessionResult> {
  assertWithinRateLimit(RATE_LIMITS.INVITE_FAILURE, clientIp);
  const { rooms } = getUserRepositories();

  if (existing) {
    const currentRoom = await rooms.getRoomOverview(existing.roomId);
    if (currentRoom && currentRoom.members.length >= MAX_ROOM_MEMBERS) {
      throw new AppError(ERRORS.ROOM.ALREADY_IN_ROOM);
    }
  }

  const now = new Date();
  const inviteHash = toInviteHash(input);
  const roomId = await rooms.findRoomIdByInvite(inviteHash, now);
  if (!roomId) rejectInvite(clientIp);
  if (existing?.roomId === roomId) throw new AppError(ERRORS.ROOM.ALREADY_IN_ROOM);

  const { member, issued } = issueMemberCredentials("partner", input.nickname ?? DEFAULT_NICKNAME);
  const joined = await rooms.joinRoomByInvite(roomId, inviteHash, member, now);
  if (!joined) rejectInvite(clientIp);

  return { session: toSession(roomId, member), issued };
}

/** Rời phòng; người cuối cùng rời thì xóa cứng cả phòng (không để dữ liệu mồ côi). */
export async function leaveRoom(session: MemberSession): Promise<void> {
  const { rooms } = getUserRepositories();
  const room = await rooms.getRoomOverview(session.roomId);
  if (!room || room.members.length <= 1) {
    await rooms.deleteRoomCascade(session.roomId);
    return;
  }
  await rooms.revokeMember(session.roomId, session.memberId, new Date());
}

export async function revokeRoomMember(session: MemberSession, memberId: string): Promise<void> {
  if (memberId === session.memberId) throw new AppError(ERRORS.ROOM.CANNOT_REVOKE_SELF);
  const revoked = await getUserRepositories().rooms.revokeMember(session.roomId, memberId, new Date());
  if (!revoked) throw new AppError(ERRORS.ROOM.MEMBER_NOT_FOUND);
}

export async function deleteRoom(session: MemberSession): Promise<void> {
  await getUserRepositories().rooms.deleteRoomCascade(session.roomId);
}

/**
 * Silent Recovery / link sao lưu: khóa khôi phục hợp lệ thì cấp token phiên mới (token cũ mất hiệu lực).
 */
export async function recoverSession(recoveryKey: string, clientIp: string): Promise<SessionResult> {
  assertWithinRateLimit(RATE_LIMITS.RECOVERY_FAILURE, clientIp);
  const { rooms } = getUserRepositories();

  const member = await rooms.findMemberByRecoveryHash(hashSecret(recoveryKey));
  if (!member) {
    recordRateLimitHit(RATE_LIMITS.RECOVERY_FAILURE, clientIp);
    throw new AppError(ERRORS.ROOM.RECOVERY_INVALID);
  }

  const sessionToken = generateSecret(SESSION_TOKEN_BYTES);
  await rooms.updateMemberCredentials(member.memberId, { sessionHash: hashSecret(sessionToken) }, new Date());
  return { session: member, issued: { sessionToken } };
}

/** Cấp khóa khôi phục mới (khi người dùng làm mất khóa cũ); khóa và link sao lưu cũ hết hiệu lực. */
export async function rotateRecoveryKey(session: MemberSession): Promise<string> {
  const recoveryKey = generateSecret(RECOVERY_KEY_BYTES);
  await getUserRepositories().rooms.updateMemberCredentials(
    session.memberId,
    { recoveryHash: hashSecret(recoveryKey) },
    new Date()
  );
  return recoveryKey;
}
