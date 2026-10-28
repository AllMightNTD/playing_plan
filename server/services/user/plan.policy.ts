import { AppError, ERRORS } from "@/server/http/errors";
import { vietnamLocalToUtc } from "@/lib/datetime";
import { SECRET_REVEAL_LEAD_MS } from "@/lib/constants/user";
import type { DatePlan } from "@/server/db/schema";

/** Giữ như bản cũ: chưa có điểm dừng thì coi buổi hẹn kéo dài 3 tiếng. */
const DEFAULT_PLAN_DURATION_MIN = 180;

type SecretFields = Pick<DatePlan, "isSecret" | "createdBy" | "revealAt">;

/** F19: người không tạo kế hoạch bất ngờ chưa được xem chi tiết trước `reveal_at`. */
export function isSecretLockedFor(plan: SecretFields, memberId: string, now: Date): boolean {
  if (!plan.isSecret || plan.createdBy === memberId) return false;
  return !plan.revealAt || plan.revealAt > now;
}

export function assertNotSecretLocked(plan: SecretFields, memberId: string, now: Date): void {
  if (isSecretLockedFor(plan, memberId, now)) throw new AppError(ERRORS.PLAN.SECRET_LOCKED);
}

/** F08: phát hiện "Người ấy vừa sửa" khi client gửi kèm mốc `updatedAt` đã đọc. */
export function assertNoConcurrentEdit(currentUpdatedAt: Date, expectedUpdatedAt: Date | undefined): void {
  if (expectedUpdatedAt && currentUpdatedAt.getTime() > expectedUpdatedAt.getTime()) {
    throw new AppError(ERRORS.PLAN.CONFLICT);
  }
}

/** Kéo thả chỉ đổi thứ tự: danh sách gửi lên phải đúng bằng tập điểm dừng hiện có. */
export function assertSameStopSet(currentStopIds: string[], requestedStopIds: string[]): void {
  const current = new Set(currentStopIds);
  const isSameSet =
    current.size === requestedStopIds.length && requestedStopIds.every((stopId) => current.has(stopId));
  if (!isSameSet) throw new AppError(ERRORS.PLAN.STOPS_CHANGED);
}

/** F19: không chọn giờ mở khóa thì mặc định 2 giờ trước giờ hẹn. */
export function resolveRevealAt(input: {
  isSecret: boolean;
  revealAt?: Date;
  planDate: string;
  startTime: string;
}): Date | null {
  if (!input.isSecret) return null;
  if (input.revealAt) return input.revealAt;
  return new Date(vietnamLocalToUtc(input.planDate, input.startTime).getTime() - SECRET_REVEAL_LEAD_MS);
}

/** Thời lượng buổi hẹn = tổng thời lượng các điểm dừng (chưa có điểm nào thì lấy mặc định). */
export function totalDurationMin(stops: { durationMin: number }[]): number {
  const total = stops.reduce((sum, stop) => sum + stop.durationMin, 0);
  return total > 0 ? total : DEFAULT_PLAN_DURATION_MIN;
}
