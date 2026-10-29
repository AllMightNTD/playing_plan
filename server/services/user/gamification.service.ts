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

export interface BlindDateStepDto {
  step: number;
  title: string;
  hint: string;
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
  placeId?: string;
  placeName: string;
  district: string;
  method: "gps_auto" | "manual_confirm";
}

export interface CheckInResultDto {
  checkin: PlaceCheckinRecord;
  advancedBlindStep: boolean;
  unlockedSecretNotesCount: number;
  scratchMap: ScratchMapDto;
}

export const HANOI_7_DISTRICTS = [
  { key: "tay_ho", name: "Tây Hồ" },
  { key: "hoan_kiem", name: "Hoàn Kiếm" },
  { key: "ba_dinh", name: "Ba Đình" },
  { key: "dong_da", name: "Đống Đa" },
  { key: "thanh_xuan", name: "Thanh Xuân" },
  { key: "hai_ba_trung", name: "Hai Bà Trưng" },
  { key: "cau_giay", name: "Cầu Giấy" },
];

const PRESET_BLIND_STEPS: Record<"budget" | "medium" | "luxury", BlindDateStep[]> = {
  budget: [
    {
      step: 1,
      title: "Chặng 1: Thơm nồng cà phê phố cổ",
      hint: "Quán cà phê gia truyền nổi tiếng với món cà phê trứng thơm bùi ngắm phố cổ",
      placeId: "cafe-giang",
      placeName: "Café Giảng - 39 Nguyễn Hữu Huân",
      district: "hoan_kiem",
      isUnlocked: true,
    },
    {
      step: 2,
      title: "Chặng 2: Nắng rọi tán sấu ven hồ",
      hint: "Tản bộ tay trong tay dưới tán liễu và hàng sấu cổ thụ ven hồ nước biểu tượng",
      placeId: "ho-guom-walk",
      placeName: "Đường đôi Đinh Tiên Hoàng - Hồ Gươm",
      district: "hoan_kiem",
      isUnlocked: false,
    },
    {
      step: 3,
      title: "Chặng 3: Que kem cốm ngọt ngào",
      hint: "Thưởng thức que kem cốm sữa thơm ngọt ven bờ hồ chiều thu gió mát",
      placeId: "kem-thuy-ta",
      placeName: "Kem Thủy Tạ - Bờ Hồ",
      district: "hoan_kiem",
      isUnlocked: false,
    },
  ],
  medium: [
    {
      step: 1,
      title: "Chặng 1: Ngắm đoàn tàu qua nhịp cầu sắt",
      hint: "Quán cà phê tầng thượng view trọn vẹn nhịp cầu Long Biên thế kỷ",
      placeId: "serein-cafe",
      placeName: "Serein Café Cầu Long Biên",
      district: "hoan_kiem",
      isUnlocked: true,
    },
    {
      step: 2,
      title: "Chặng 2: Hoàng hôn cỏ lau ven sông",
      hint: "Bãi cỏ lau lãng mạn ven triền đê sông Hồng, đón hoàng hôn rực rỡ",
      placeId: "bai-da-song-hong",
      placeName: "Bãi đá sông Hồng",
      district: "tay_ho",
      isUnlocked: false,
    },
    {
      step: 3,
      title: "Chặng 3: Không gian nghệ thuật & tĩnh lặng",
      hint: "Tòa biệt thự Pháp cổ trưng bày những tác phẩm mỹ thuật quý giá",
      placeId: "bao-tang-my-thuat",
      placeName: "Bảo Tàng Mỹ Thuật Việt Nam",
      district: "ba_dinh",
      isUnlocked: false,
    },
  ],
  luxury: [
    {
      step: 1,
      title: "Chặng 1: Afternoon Tea hoàng gia",
      hint: "Tiệc trà chiều lãng mạn trên mặt nước Hồ Tây mênh mông",
      placeId: "sunset-bar-intercon",
      placeName: "Sunset Bar InterContinental Hồ Tây",
      district: "tay_ho",
      isUnlocked: true,
    },
    {
      step: 2,
      title: "Chặng 2: Thưởng lãm kiến trúc di sản",
      hint: "Dạo bước dưới mái vòm phong cách tân cổ điển và quảng trường lộng gió",
      placeId: "nha-hat-lon",
      placeName: "Nhà hát Lớn Hà Nội",
      district: "hoan_kiem",
      isUnlocked: false,
    },
    {
      step: 3,
      title: "Chặng 3: Bữa tối nến thơm & rượu vang",
      hint: "Không gian ẩm thực Pháp tinh tế và ấm cúng cùng những giai điệu jazz",
      placeId: "la-badiane",
      placeName: "La Badiane Hà Nội",
      district: "hoan_kiem",
      isUnlocked: false,
    },
  ],
};

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
    const defaultSteps = PRESET_BLIND_STEPS.medium.map((s) => ({ ...s }));
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
  const presets = PRESET_BLIND_STEPS[budgetTier] || PRESET_BLIND_STEPS.medium;
  const steps = presets.map((s) => ({ ...s, isUnlocked: s.step === 1 }));

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
  if (!input.placeName || !input.district) {
    throw new AppError(ERRORS.COMMON.VALIDATION_FAILED);
  }

  const repo = getUserRepositories().gamification;
  const now = new Date();

  // 1. Ghi nhận check-in
  const checkin: PlaceCheckinRecord = {
    id: "chk_" + nanoid(16),
    roomId: session.roomId,
    memberId: session.memberId,
    placeId: input.placeId || "plc_" + nanoid(12),
    placeName: input.placeName,
    district: input.district,
    method: input.method,
    checkedInAt: now,
  };
  await repo.recordCheckin(checkin);

  // 2. Tự động mở chặng tiếp theo của Vé Mù (nếu còn chặng)
  let advancedBlindStep = false;
  const ticket = await repo.getActiveBlindDateTicket(session.roomId);
  if (ticket && ticket.status === "in_progress" && ticket.currentStep < ticket.totalSteps) {
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
    input.placeId || input.placeName,
    now
  );

  if (unlockedNotes.length > 0) {
    try {
      await createRoomNotice(session.roomId, {
        noticeType: "secret_note_unlocked",
        title: "💌 Thư tình bí mật đã mở khóa!",
        content: `Một thành viên vừa check-in tại "${input.placeName}" và đã mở khóa bức thư tình cất giấu!`,
        metadata: {
          placeName: input.placeName,
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
  input: { placeId?: string; placeName: string; district?: string; hint?: string; content: string }
): Promise<SecretNoteDto> {
  if (!input.placeName || !input.content || input.content.trim().length === 0) {
    throw new AppError(ERRORS.COMMON.VALIDATION_FAILED);
  }

  const repo = getUserRepositories().gamification;
  const note: SecretNoteRecord = {
    id: "sn_" + nanoid(16),
    roomId: session.roomId,
    authorMemberId: session.memberId,
    placeId: input.placeId || "plc_" + nanoid(12),
    placeName: input.placeName,
    district: input.district || "hoan_kiem",
    hint: input.hint || "Check-in tại quán để mở bức thư tình này",
    content: input.content.trim(),
    isUnlocked: false,
    unlockedAt: null,
    createdAt: new Date(),
  };

  await repo.createSecretNote(note);

  return {
    id: note.id,
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
