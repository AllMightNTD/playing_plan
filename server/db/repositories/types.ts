import type { ChecklistItem, DatePlan, PlanStop } from "@/server/db/schema";
import type { SwipeChoice } from "@/lib/constants/user";

export type MemberRole = "creator" | "partner";

export interface MemberSession {
  memberId: string;
  roomId: string;
  role: MemberRole;
  nickname: string | null;
}

export interface NewMemberRecord {
  id: string;
  sessionHash: string;
  recoveryHash: string;
  nickname: string;
  role: MemberRole;
}

export interface MemberCredentials {
  sessionHash?: string;
  recoveryHash?: string;
}

export interface RoomMemberView {
  id: string;
  nickname: string | null;
  role: MemberRole;
  lastSeenAt: Date;
  createdAt: Date;
}

export interface RoomOverview {
  id: string;
  name: string | null;
  memberCount: number;
  status: "solo" | "paired" | "deleted";
  anniversaryDate: string | null;
  inviteExpiresAt: Date | null;
  members: RoomMemberView[];
}

export interface RoomProfilePatch {
  name?: string | null;
  anniversaryDate?: string | null;
}

export interface InviteRecord {
  tokenHash: string;
  codeHash: string;
  expiresAt: Date;
}

/** DAL phòng: mọi hàm đọc/ghi dữ liệu riêng đều bị giới hạn theo roomId lấy từ phiên. */
export interface RoomRepository {
  createRoomWithCreator(roomId: string, creator: NewMemberRecord, now: Date): Promise<void>;
  findMemberBySessionHash(sessionHash: string): Promise<MemberSession | null>;
  findMemberByRecoveryHash(recoveryHash: string): Promise<MemberSession | null>;
  updateMemberCredentials(memberId: string, credentials: MemberCredentials, now: Date): Promise<void>;
  updateMemberNickname(roomId: string, memberId: string, nickname: string): Promise<void>;
  updateRoomProfile(roomId: string, profile: RoomProfilePatch, now: Date): Promise<void>;
  getRoomOverview(roomId: string): Promise<RoomOverview | null>;
  saveInvite(roomId: string, invite: InviteRecord, now: Date): Promise<void>;
  findRoomIdByInvite(inviteHash: string, now: Date): Promise<string | null>;
  /** Atomic Join: chỉ thành công khi lời mời còn hiệu lực và phòng còn chỗ; lời mời bị hủy ngay sau đó. */
  joinRoomByInvite(roomId: string, inviteHash: string, partner: NewMemberRecord, now: Date): Promise<boolean>;
  revokeMember(roomId: string, memberId: string, now: Date): Promise<boolean>;
  deleteRoomCascade(roomId: string): Promise<void>;
}

export interface PlanScope {
  roomId: string;
  planId: string;
}

/** Dấu vết cập nhật: ai sửa, lúc nào (F08 "Cập nhật bởi ... lúc ..."). */
export interface PlanTouch {
  at: Date;
  by: string;
}

export type PlanPatch = Partial<Pick<DatePlan, "title" | "planDate" | "startTime" | "status" | "budget" | "note">>;
export type StopPatch = Partial<Pick<PlanStop, "customName" | "plannedTime" | "durationMin" | "note">>;
export type ChecklistPatch = Partial<Pick<ChecklistItem, "content" | "isDone" | "assignedTo">>;
export type NewStopRecord = Omit<PlanStop, "sortOrder" | "planId">;
export type NewChecklistRecord = Omit<ChecklistItem, "sortOrder" | "planId">;

export interface PlanRepository {
  listByRoom(roomId: string, limit: number): Promise<DatePlan[]>;
  findById(scope: PlanScope): Promise<DatePlan | null>;
  listStops(scope: PlanScope): Promise<PlanStop[]>;
  listChecklist(scope: PlanScope): Promise<ChecklistItem[]>;
  insertPlan(plan: DatePlan, firstStop: NewStopRecord | null): Promise<void>;
  updatePlan(scope: PlanScope, patch: PlanPatch, touch: PlanTouch): Promise<void>;
  deletePlanCascade(scope: PlanScope): Promise<void>;
  /** Trả về null khi đã đủ `maxStops` điểm dừng. */
  insertStopWithinLimit(scope: PlanScope, stop: NewStopRecord, maxStops: number, touch: PlanTouch): Promise<PlanStop | null>;
  updateStop(scope: PlanScope, stopId: string, patch: StopPatch, touch: PlanTouch): Promise<boolean>;
  reorderStops(scope: PlanScope, orderedStopIds: string[], touch: PlanTouch): Promise<void>;
  deleteStop(scope: PlanScope, stopId: string, touch: PlanTouch): Promise<boolean>;
  insertChecklistItemWithinLimit(
    scope: PlanScope,
    item: NewChecklistRecord,
    maxItems: number,
    touch: PlanTouch
  ): Promise<ChecklistItem | null>;
  updateChecklistItem(scope: PlanScope, itemId: string, patch: ChecklistPatch, touch: PlanTouch): Promise<boolean>;
  deleteChecklistItem(scope: PlanScope, itemId: string, touch: PlanTouch): Promise<boolean>;
}

export interface SwipeInput {
  roomId: string;
  memberId: string;
  placeId: string;
  choice: SwipeChoice;
  now: Date;
}

export interface MatchRecord {
  id: string;
  placeId: string;
  matchedAt: Date;
  status: "open" | "planned" | "dismissed";
}

export interface SwipeRepository {
  listSwipedPlaceIds(roomId: string, memberId: string): Promise<string[]>;
  /**
   * Lưu lựa chọn và đồng bộ Match trong cùng transaction (F07): cả hai cùng thích thì tạo Match,
   * bỏ thích thì gỡ Match chưa lên kế hoạch. Trả về id Match đang mở (nếu có).
   */
  saveSwipeAndSyncMatch(input: SwipeInput): Promise<string | null>;
  listMatches(roomId: string): Promise<MatchRecord[]>;
}

export interface SavedPlaceRepository {
  listPlaceIds(memberId: string): Promise<string[]>;
  save(memberId: string, placeId: string, now: Date): Promise<void>;
  remove(memberId: string, placeId: string): Promise<void>;
}

export interface UserRepositories {
  rooms: RoomRepository;
  plans: PlanRepository;
  swipes: SwipeRepository;
  saved: SavedPlaceRepository;
}
