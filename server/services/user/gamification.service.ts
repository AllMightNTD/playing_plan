import { nanoid } from "nanoid";
import { getUserRepositories } from "@/server/db/repositories";
import { AppError, ERRORS } from "@/server/http/errors";
import type {
  BlindDateStep,
  BlindDateTicketRecord,
  MemberSession,
  PlaceCheckinRecord,
  SecretNoteRecord,
} from "@/server/db/repositories/types";
import { createRoomNotice } from "@/server/services/user/room-notice.service";
import { getAllPublishedPlaces, requirePublishedPlace } from "@/server/services/user/places.service";
import { HANOI_7_DISTRICTS, resolveDistrictKey } from "@/lib/districts";
import type { HanoiPlace } from "@/lib/types/catalog";
import type { PlaceCategory } from "@/lib/constants/catalog";

export interface BlindDateStepDto {
  step: number;
  title: string;
  hint: string;
  placeId: string;
  placeName: string;
  district: string;
  isUnlocked: boolean;
}

export interface BlindDateTicketDto {
  id: string;
  budgetTier: "budget" | "medium" | "luxury";
  currentStep: number;
  totalSteps: number;
  status: "in_progress" | "completed" | "cancelled";
  steps: BlindDateStepDto[];
  createdAt: Date;
}

export interface SecretNoteDto {
  id: string;
  placeId: string;
  placeName: string;
  district: string;
  hint: string;
  content: string;
  isUnlocked: boolean;
  isMine: boolean;
  createdAt: Date;
  unlockedAt: Date | null;
}

export interface DistrictScratchTileDto {
  key: string;
  name: string;
  count: number;
  scratched: boolean;
}

export interface ScratchMapDto {
  districts: DistrictScratchTileDto[];
  scratchedCount: number;
  totalDistricts: number;
  unlockedPercentage: number;
}

export interface CheckInInput {
  placeId: string;
  method: "gps_auto" | "manual_confirm";
}

export interface CreateSecretNoteInput {
  placeId: string;
  hint?: string;
  content: string;
}

export interface CheckInResultDto {
  checkin: PlaceCheckinRecord;
  advancedBlindStep: boolean;
  unlockedSecretNotesCount: number;
  scratchMap: ScratchMapDto;
}

type BudgetTier = BlindDateTicketRecord["budgetTier"];

/** Mỗi tier lọc theo priceLevel (1 rẻ → 3 sang) của catalog. */
const PRICE_LEVELS_BY_TIER: Record<BudgetTier, number[]> = {
  budget: [1],
  medium: [1, 2],
  luxury: [2, 3],
};

/** 3 chặng: khởi động bằng đồ uống, đi dạo/chơi, kết thúc bằng bữa tối. */
const BLIND_STEP_SLOTS: { title: string; categories: PlaceCategory[] }[] = [
  { title: "Chặng 1: Khởi động nhẹ nhàng", categories: ["cafe"] },
  { title: "Chặng 2: Dạo chơi tay trong tay", categories: ["walk", "photo", "nature", "fun", "indoor"] },
  { title: "Chặng 3: Bữa tối khép lại ngày hẹn", categories: ["food"] },
];

function pickRandom<T>(items: T[]): T | undefined {
  return items[Math.floor(Math.random() * items.length)];
}

/** Gợi ý chỉ lộ loại hình và không khí, không lộ tên hay khu vực của chặng còn khóa. */
function toBlindHint(place: HanoiPlace): string {
  return [place.categoryLabel, ...place.moodLabels.slice(0, 2), place.costText].filter(Boolean).join(" • ");
}

/**
 * Dựng 3 chặng vé mù từ catalog đã xuất bản: ưu tiên đúng tier giá, đúng loại chặng,
 * và cùng quận với chặng 1 để đi lại gần; thiếu thì nới dần điều kiện.
 */
export function buildBlindDateSteps(places: HanoiPlace[], budgetTier: BudgetTier): BlindDateStep[] {
  const inTier = places.filter((p) => PRICE_LEVELS_BY_TIER[budgetTier].includes(p.priceLevel));
  const pool = inTier.length >= BLIND_STEP_SLOTS.length ? inTier : places;
  const chosen: HanoiPlace[] = [];

  for (const slot of BLIND_STEP_SLOTS) {
    const unused = pool.filter((p) => !chosen.includes(p));
    const bySlot = unused.filter((p) => slot.categories.includes(p.category));
    const firstDistrict = chosen[0] ? resolveDistrictKey(chosen[0].area) : null;
    const nearby = bySlot.filter((p) => firstDistrict && resolveDistrictKey(p.area) === firstDistrict);
    const place = pickRandom(nearby.length > 0 ? nearby : bySlot.length > 0 ? bySlot : unused);
    if (place) chosen.push(place);
  }

  if (chosen.length < BLIND_STEP_SLOTS.length) throw new AppError(ERRORS.PLACE.NO_CANDIDATE);

  return chosen.map((place, idx) => ({
    step: idx + 1,
    title: BLIND_STEP_SLOTS[idx].title,
    hint: toBlindHint(place),
    placeId: place.id,
    placeName: place.name,
    district: resolveDistrictKey(place.area),
    isUnlocked: idx === 0,
  }));
}

function toBlindDateTicketDto(ticket: BlindDateTicketRecord): BlindDateTicketDto {
  return {
    id: ticket.id,
    budgetTier: ticket.budgetTier,
    currentStep: ticket.currentStep,
    totalSteps: ticket.totalSteps,
    status: ticket.status,
    steps: ticket.steps.map((s) => {
      const isUnlocked = s.step <= ticket.currentStep;
      return {
        step: s.step,
        title: s.title,
        hint: s.hint,
        // Server-Side Masking: Giấu hoàn toàn tọa độ và tên quán nếu chưa mở khóa!
        placeId: isUnlocked ? s.placeId : "",
        placeName: isUnlocked ? s.placeName : "🔒 Server Locked",
        district: isUnlocked ? s.district : "",
        isUnlocked,
      };
    }),
    createdAt: ticket.createdAt,
  };
}

/** Lấy vé mù hiện tại của phòng. Nếu chưa có, tự động khởi tạo vé mặc định */
export async function getBlindDateTicket(session: MemberSession): Promise<BlindDateTicketDto> {
  const repo = getUserRepositories().gamification;
  let ticket = await repo.getActiveBlindDateTicket(session.roomId);

  if (!ticket) {
    const defaultSteps = buildBlindDateSteps(await getAllPublishedPlaces(), "medium");
    ticket = {
      id: "bdt_" + nanoid(16),
      roomId: session.roomId,
      budgetTier: "medium",
      currentStep: 1,
      totalSteps: 3,
      status: "in_progress",
      steps: defaultSteps,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await repo.createBlindDateTicket(ticket);
  }

  return toBlindDateTicketDto(ticket);
}

/** Tạo hoặc đặt lại vé mù mới theo mức ngân sách */
export async function createBlindDateTicket(
  session: MemberSession,
  budgetTier: "budget" | "medium" | "luxury"
): Promise<BlindDateTicketDto> {
  const repo = getUserRepositories().gamification;
  const steps = buildBlindDateSteps(await getAllPublishedPlaces(), budgetTier);

  const ticket: BlindDateTicketRecord = {
    id: "bdt_" + nanoid(16),
    roomId: session.roomId,
    budgetTier,
    currentStep: 1,
    totalSteps: 3,
    status: "in_progress",
    steps,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await repo.createBlindDateTicket(ticket);
  return toBlindDateTicketDto(ticket);
}

/** Tính toán Bản đồ cào 7 quận trực tiếp từ place_checkins (chống race condition) */
export async function getScratchMap(session: MemberSession): Promise<ScratchMapDto> {
  const repo = getUserRepositories().gamification;
  const checkins = await repo.listCheckins(session.roomId);

  const checkinCountsByDistrict = new Map<string, number>();
  for (const c of checkins) {
    const key = c.district.toLowerCase().trim();
    checkinCountsByDistrict.set(key, (checkinCountsByDistrict.get(key) || 0) + 1);
  }

  const districts: DistrictScratchTileDto[] = HANOI_7_DISTRICTS.map((d) => {
    const count = checkinCountsByDistrict.get(d.key) || 0;
    return {
      key: d.key,
      name: d.name,
      count,
      scratched: count > 0,
    };
  });

  const scratchedCount = districts.filter((d) => d.scratched).length;
  const totalDistricts = districts.length;
  const unlockedPercentage = Math.round((scratchedCount / totalDistricts) * 100);

  return {
    districts,
    scratchedCount,
    totalDistricts,
    unlockedPercentage,
  };
}

/** Thực hiện Check-in tại quán (mở khóa Vé Mù, mở Thư Tình và cào Bản Đồ) */
export async function checkInPlace(
  session: MemberSession,
  input: CheckInInput
): Promise<CheckInResultDto> {
  // Tên quán và quận lấy từ catalog, không tin dữ liệu client gửi lên
  const place = await requirePublishedPlace(input.placeId);
  const repo = getUserRepositories().gamification;
  const now = new Date();

  // 1. Ghi nhận check-in
  const checkin: PlaceCheckinRecord = {
    id: "chk_" + nanoid(16),
    roomId: session.roomId,
    memberId: session.memberId,
    placeId: place.id,
    placeName: place.name,
    district: resolveDistrictKey(place.area),
    method: input.method,
    checkedInAt: now,
  };
  await repo.recordCheckin(checkin);

  // 2. Mở chặng tiếp theo của Vé Mù khi check-in đúng địa điểm của chặng đang mở
  let advancedBlindStep = false;
  const ticket = await repo.getActiveBlindDateTicket(session.roomId);
  const currentStepPlaceId = ticket?.steps.find((s) => s.step === ticket.currentStep)?.placeId;
  if (
    ticket &&
    ticket.status === "in_progress" &&
    ticket.currentStep < ticket.totalSteps &&
    currentStepPlaceId === place.id
  ) {
    const nextStep = ticket.currentStep + 1;
    const isCompleted = nextStep >= ticket.totalSteps;
    await repo.updateBlindDateTicket(
      session.roomId,
      ticket.id,
      nextStep,
      isCompleted ? "completed" : "in_progress"
    );
    advancedBlindStep = true;
  }

  // 3. Mở khóa Thư tình ẩn giấu tại quán & bắn notice vào room_notices
  const unlockedNotes = await repo.unlockSecretNotesForPlace(
    session.roomId,
    place.id,
    now
  );

  if (unlockedNotes.length > 0) {
    try {
      await createRoomNotice(session.roomId, {
        noticeType: "secret_note_unlocked",
        title: "💌 Thư tình bí mật đã mở khóa!",
        content: `Một thành viên vừa check-in tại "${place.name}" và đã mở khóa bức thư tình cất giấu!`,
        metadata: {
          placeName: place.name,
          notesCount: unlockedNotes.length,
          checkedInAt: now.toISOString(),
        },
      });
    } catch {
      // Ignored
    }
  }

  // 4. Lấy lại bản đồ cào cập nhật mới nhất
  const scratchMap = await getScratchMap(session);

  return {
    checkin,
    advancedBlindStep,
    unlockedSecretNotesCount: unlockedNotes.length,
    scratchMap,
  };
}

/** Tạo thư tình bí mật cất giấu tại quán */
export async function createSecretNote(
  session: MemberSession,
  input: CreateSecretNoteInput
): Promise<SecretNoteDto> {
  if (!input.content || input.content.trim().length === 0) {
    throw new AppError(ERRORS.COMMON.VALIDATION_FAILED);
  }

  const place = await requirePublishedPlace(input.placeId);
  const repo = getUserRepositories().gamification;
  const note: SecretNoteRecord = {
    id: "sn_" + nanoid(16),
    roomId: session.roomId,
    authorMemberId: session.memberId,
    placeId: place.id,
    placeName: place.name,
    district: resolveDistrictKey(place.area),
    hint: input.hint || `Check-in tại ${place.name} để mở bức thư tình này`,
    content: input.content.trim(),
    isUnlocked: false,
    unlockedAt: null,
    createdAt: new Date(),
  };

  await repo.createSecretNote(note);

  return {
    id: note.id,
    placeId: note.placeId,
    placeName: note.placeName,
    district: note.district,
    hint: note.hint,
    content: note.content,
    isUnlocked: false,
    isMine: true,
    createdAt: note.createdAt,
    unlockedAt: null,
  };
}

/** Lấy danh sách thư tình của phòng (che nội dung với thư chưa mở khóa) */
export async function listSecretNotes(session: MemberSession): Promise<SecretNoteDto[]> {
  const repo = getUserRepositories().gamification;
  const notes = await repo.listSecretNotes(session.roomId);

  return notes.map((n) => ({
    id: n.id,
    placeId: n.placeId,
    placeName: n.placeName,
    district: n.district,
    hint: n.hint,
    // Server-Side Masking: Không để lộ thư tình khi chưa Check-in
    content: n.isUnlocked
      ? n.content
      : "🔒 Nội dung thư đang được mã hóa cho tới khi Check-in tại quán.",
    isUnlocked: n.isUnlocked,
    isMine: n.authorMemberId === session.memberId,
    createdAt: n.createdAt,
    unlockedAt: n.unlockedAt,
  }));
}
