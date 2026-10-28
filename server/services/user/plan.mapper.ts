import { isSecretLockedFor } from "@/server/services/user/plan.policy";
import type { ChecklistItem, DatePlan, PlanStop } from "@/server/db/schema";
import type { PlanStatus } from "@/lib/constants/user";

const LOCKED_TITLE = "Buổi hẹn bất ngờ 🎁";

export interface PlanSummaryDto {
  id: string;
  title: string;
  planDate: string;
  startTime: string;
  status: PlanStatus;
  budget: number | null;
  note: string | null;
  isSecret: boolean;
  isSecretLocked: boolean;
  revealAt: Date | null;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string | null;
}

export interface PlanStopDto {
  id: string;
  placeId: string | null;
  customName: string | null;
  sortOrder: number;
  plannedTime: string | null;
  durationMin: number;
  note: string | null;
}

export interface ChecklistItemDto {
  id: string;
  content: string;
  isDone: boolean;
  assignedTo: string | null;
  sortOrder: number;
}

export interface PlanDetailDto extends PlanSummaryDto {
  stops: PlanStopDto[];
  checklist: ChecklistItemDto[];
}

/** Kế hoạch bất ngờ đang khóa chỉ lộ ngày/giờ hẹn, che tiêu đề, ghi chú và ngân sách (F19). */
export function toPlanSummaryDto(plan: DatePlan, memberId: string, now: Date): PlanSummaryDto {
  const isLocked = isSecretLockedFor(plan, memberId, now);
  return {
    id: plan.id,
    title: isLocked ? LOCKED_TITLE : plan.title,
    planDate: plan.planDate,
    startTime: plan.startTime,
    status: plan.status,
    budget: isLocked ? null : plan.budget,
    note: isLocked ? null : plan.note,
    isSecret: plan.isSecret,
    isSecretLocked: isLocked,
    revealAt: plan.revealAt,
    createdBy: plan.createdBy,
    updatedAt: plan.updatedAt,
    updatedBy: plan.updatedBy,
  };
}

export function toPlanStopDto(stop: PlanStop): PlanStopDto {
  return {
    id: stop.id,
    placeId: stop.placeId,
    customName: stop.customName,
    sortOrder: stop.sortOrder,
    plannedTime: stop.plannedTime,
    durationMin: stop.durationMin,
    note: stop.note,
  };
}

export function toChecklistItemDto(item: ChecklistItem): ChecklistItemDto {
  return {
    id: item.id,
    content: item.content,
    isDone: item.isDone,
    assignedTo: item.assignedTo,
    sortOrder: item.sortOrder,
  };
}

/** Checklist là phần chuẩn bị chung nên vẫn hiện khi khóa; điểm dừng thì ẩn hoàn toàn. */
export function toPlanDetailDto(
  plan: DatePlan,
  stops: PlanStop[],
  checklist: ChecklistItem[],
  memberId: string,
  now: Date
): PlanDetailDto {
  const summary = toPlanSummaryDto(plan, memberId, now);
  return {
    ...summary,
    stops: summary.isSecretLocked ? [] : stops.map(toPlanStopDto),
    checklist: checklist.map(toChecklistItemDto),
  };
}
