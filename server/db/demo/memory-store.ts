import type { ChecklistItem, DatePlan, MemoryNote, PlanStop, Room, RoomMember } from "@/server/db/schema";
import type { MatchRecord } from "@/server/db/repositories/types";
import type { SwipeChoice } from "@/lib/constants/user";

interface MemorySwipe {
  roomId: string;
  memberId: string;
  placeId: string;
  choice: SwipeChoice;
}

interface MemoryStore {
  rooms: Map<string, Room>;
  members: Map<string, RoomMember>;
  plans: Map<string, DatePlan>;
  stopsByPlan: Map<string, PlanStop[]>;
  checklistByPlan: Map<string, ChecklistItem[]>;
  /** key = `${memberId}:${placeId}` (khớp PK của bảng swipes). */
  swipes: Map<string, MemorySwipe>;
  /** key = `${roomId}:${placeId}` (khớp unique của bảng matches). */
  matches: Map<string, MatchRecord & { roomId: string }>;
  savedByMember: Map<string, Map<string, Date>>;
  memoryNotes: Map<string, MemoryNote>;
}

function createEmptyStore(): MemoryStore {
  return {
    rooms: new Map(),
    members: new Map(),
    plans: new Map(),
    stopsByPlan: new Map(),
    checklistByPlan: new Map(),
    swipes: new Map(),
    matches: new Map(),
    savedByMember: new Map(),
    memoryNotes: new Map(),
  };
}

// Gắn vào globalThis để dữ liệu demo sống qua các lần hot-reload của Next dev server.
const globalScope = globalThis as unknown as { __datemateMemoryStore?: MemoryStore };

export function getMemoryStore(): MemoryStore {
  globalScope.__datemateMemoryStore ??= createEmptyStore();
  return globalScope.__datemateMemoryStore;
}

/** Chỉ dùng trong test để mỗi test case bắt đầu từ store sạch. */
export function resetMemoryStore(): void {
  globalScope.__datemateMemoryStore = createEmptyStore();
}
