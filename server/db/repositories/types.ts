import type { ChecklistItem, DatePlan, MemoryNote, PlanStop } from "@/server/db/schema";
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
  roomType: "couple" | "group";
  maxMembers: number;
  storageQuotaBytes: number;
  storageUsedBytes: number;
  photoCount: number;
  maxPhotos: number;
  version: number;
  consentVersion: string | null;
  consentAt: Date | null;
  pendingDeletedAt: Date | null;
  members: RoomMemberView[];
}

export interface RoomProfilePatch {
  name?: string | null;
  anniversaryDate?: string | null;
  consentVersion?: string | null;
  consentAt?: Date | null;
  pendingDeletedAt?: Date | null;
  status?: "solo" | "paired" | "deleted";
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

export type PlanPatch = Partial<Pick<DatePlan, "title" | "planDate" | "startTime" | "status" | "budget" | "note" | "shareToken" | "shareExpiresAt" | "version">>;
export type StopPatch = Partial<Pick<PlanStop, "placeId" | "customName" | "plannedTime" | "durationMin" | "dayOffset" | "startMinute" | "travelMinutes" | "isPinnedTime" | "note">>;
export type ChecklistPatch = Partial<Pick<ChecklistItem, "content" | "isDone" | "assignedTo">>;
export type NewStopRecord = Omit<PlanStop, "sortOrder" | "planId">;
export type NewChecklistRecord = Omit<ChecklistItem, "sortOrder" | "planId">;

export interface PlanRsvpRecord {
  id: string;
  planId: string;
  roomId: string;
  responderName: string;
  status: "confirmed" | "change_requested";
  changeNote: string | null;
  createdAt: Date;
}

export interface PlanRepository {
  listByRoom(roomId: string, limit: number): Promise<DatePlan[]>;
  findById(scope: PlanScope): Promise<DatePlan | null>;
  findByShareToken(shareToken: string): Promise<DatePlan | null>;
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
  saveRsvp(rsvp: PlanRsvpRecord): Promise<void>;
  listRsvps(planId: string): Promise<PlanRsvpRecord[]>;
  atomicShiftSchedule(
    scope: PlanScope,
    expectedVersion: number,
    stopUpdates: Array<{ id: string; plannedTime: string | null; startMinute: number; dayOffset: number; travelMinutes?: number }>,
    touch: PlanTouch
  ): Promise<boolean>;
  updateStopsBatch(
    scope: PlanScope,
    expectedVersion: number,
    stopUpdates: Array<{ id: string; placeId?: string | null; customName?: string | null; plannedTime?: string | null; startMinute?: number; travelMinutes?: number; isPinnedTime?: boolean; note?: string | null }>,
    touch: PlanTouch
  ): Promise<boolean>;
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
  isSeen: boolean;
}

export interface SwipeSyncResult {
  matchId: string | null;
  isNewMatch: boolean;
}

export interface SwipeRepository {
  listSwipedPlaceIds(roomId: string, memberId: string): Promise<string[]>;
  /**
   * Lưu lựa chọn và đồng bộ Match trong cùng transaction: cả hai cùng thích thì tạo Match,
   * bỏ thích thì gỡ Match chưa lên kế hoạch. Trả về { matchId, isNewMatch }.
   */
  saveSwipeAndSyncMatch(input: SwipeInput): Promise<SwipeSyncResult>;
  listMatches(roomId: string): Promise<MatchRecord[]>;
  markMatchSeen(roomId: string, matchId: string): Promise<boolean>;
}

export interface SavedPlaceRepository {
  listPlaceIds(memberId: string): Promise<string[]>;
  save(memberId: string, placeId: string, now: Date): Promise<void>;
  remove(memberId: string, placeId: string): Promise<void>;
}

export interface MemoryWithCover {
  id: string;
  planId: string;
  planTitle: string | null;
  rating: number;
  journal: string | null;
  visitedAt: Date;
  coverUrl: string | null;
  coverCaption: string | null;
}

export interface MemoryRepository {
  /** Mới nhất trước. */
  listNotes(roomId: string, limit: number): Promise<MemoryNote[]>;
  /** Trả về null khi phòng đã đủ `maxNotes` giấy nhớ. */
  insertNoteWithinLimit(note: MemoryNote, maxNotes: number): Promise<MemoryNote | null>;
  deleteNote(roomId: string, noteId: string): Promise<boolean>;
  /** Kỷ niệm sau buổi hẹn kèm ảnh bìa (ảnh có sortOrder nhỏ nhất), mới nhất trước. */
  listMemories(roomId: string, limit: number): Promise<MemoryWithCover[]>;
}

export interface UploadRecord {
  id: string;
  roomId: string;
  memberId: string;
  memoryId: string | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  relativePath: string;
  createdAt: Date;
  deletedAt: Date | null;
}

export interface UploadRepository {
  getUpload(roomId: string, uploadId: string): Promise<UploadRecord | null>;
  insertUpload(upload: UploadRecord): Promise<void>;
  softDeleteUpload(roomId: string, uploadId: string, now: Date): Promise<UploadRecord | null>;
  listUploads(roomId: string): Promise<UploadRecord[]>;
  atomicAllocateQuota(roomId: string, addBytes: number, addPhotos: number): Promise<boolean>;
  atomicReleaseQuota(roomId: string, releaseBytes: number, releasePhotos: number): Promise<void>;
}

export interface RoomNoticeRecord {
  id: string;
  roomId: string;
  memberId: string | null;
  noticeType: "room_delete_pending" | "new_match" | "plan_rsvp" | "time_change_request" | "secret_note_unlocked";
  title: string;
  content: string;
  metadata: unknown;
  readAt: Date | null;
  createdAt: Date;
}

export interface RoomNoticeRepository {
  listNotices(roomId: string, memberId?: string): Promise<RoomNoticeRecord[]>;
  insertNotice(notice: RoomNoticeRecord): Promise<void>;
  markAsRead(roomId: string, noticeId: string, now: Date): Promise<boolean>;
}

export interface PlaceCheckinRecord {
  id: string;
  roomId: string;
  memberId: string;
  placeId: string;
  placeName: string;
  district: string;
  method: "gps_auto" | "manual_confirm";
  checkedInAt: Date;
}

export interface BlindDateStep {
  step: number;
  title: string;
  hint: string;
  placeId: string;
  placeName: string;
  district: string;
  isUnlocked: boolean;
}

export interface BlindDateTicketRecord {
  id: string;
  roomId: string;
  budgetTier: "budget" | "medium" | "luxury";
  currentStep: number;
  totalSteps: number;
  status: "in_progress" | "completed" | "cancelled";
  steps: BlindDateStep[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SecretNoteRecord {
  id: string;
  roomId: string;
  authorMemberId: string;
  placeId: string;
  placeName: string;
  district: string;
  hint: string;
  content: string;
  isUnlocked: boolean;
  unlockedAt: Date | null;
  createdAt: Date;
}

export interface GamificationRepository {
  getActiveBlindDateTicket(roomId: string): Promise<BlindDateTicketRecord | null>;
  createBlindDateTicket(ticket: BlindDateTicketRecord): Promise<void>;
  updateBlindDateTicket(
    roomId: string,
    ticketId: string,
    currentStep: number,
    status: "in_progress" | "completed"
  ): Promise<BlindDateTicketRecord | null>;
  recordCheckin(checkin: PlaceCheckinRecord): Promise<void>;
  listCheckins(roomId: string): Promise<PlaceCheckinRecord[]>;
  createSecretNote(note: SecretNoteRecord): Promise<void>;
  listSecretNotes(roomId: string): Promise<SecretNoteRecord[]>;
  unlockSecretNotesForPlace(roomId: string, placeIdOrName: string, now: Date): Promise<SecretNoteRecord[]>;
}

export interface UserRepositories {
  rooms: RoomRepository;
  plans: PlanRepository;
  swipes: SwipeRepository;
  saved: SavedPlaceRepository;
  memories: MemoryRepository;
  uploads: UploadRepository;
  notices: RoomNoticeRepository;
  gamification: GamificationRepository;
}

