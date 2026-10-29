import { nanoid } from "nanoid";
import { getUserRepositories } from "@/server/db/repositories";
import { requirePublishedPlace, getAllPublishedPlaces } from "@/server/services/user/places.service";
import {
  assertNoConcurrentEdit,
  assertNotSecretLocked,
  resolveRevealAt,
  totalDurationMin,
} from "@/server/services/user/plan.policy";
import {
  toPlanDetailDto,
  toPlanSummaryDto,
  type PlanDetailDto,
  type PlanSummaryDto,
} from "@/server/services/user/plan.mapper";
import { generateIcsCalendar } from "@/lib/calendar";
import { DEFAULT_STOP_DURATION_MIN, MAX_PLANS_LISTED } from "@/lib/constants/user";
import { omitUndefined } from "@/lib/utils";
import { AppError, ERRORS } from "@/server/http/errors";
import type { DatePlan, PlanStop } from "@/server/db/schema";
import type { MemberSession, PlanPatch, PlanScope, PlanTouch } from "@/server/db/repositories/types";
import type { CreatePlanBody, UpdatePlanBody } from "@/lib/validators/user";

export function toPlanScope(session: MemberSession, planId: string): PlanScope {
  return { roomId: session.roomId, planId };
}

export function toPlanTouch(session: MemberSession): PlanTouch {
  return { at: new Date(), by: session.memberId };
}

export async function loadPlanOrThrow(scope: PlanScope): Promise<DatePlan> {
  const plan = await getUserRepositories().plans.findById(scope);
  if (!plan) throw new AppError(ERRORS.PLAN.NOT_FOUND);
  return plan;
}

/** Kế hoạch có thể sửa: tồn tại trong phòng và không phải kế hoạch bất ngờ đang khóa với người gọi. */
export async function loadEditablePlan(session: MemberSession, planId: string): Promise<DatePlan> {
  const plan = await loadPlanOrThrow(toPlanScope(session, planId));
  assertNotSecretLocked(plan, session.memberId, new Date());
  return plan;
}

/** F01: chưa có phiên thì danh sách riêng trả rỗng, không báo lỗi. */
export async function listPlans(session: MemberSession | null): Promise<PlanSummaryDto[]> {
  if (!session) return [];
  const plans = await getUserRepositories().plans.listByRoom(session.roomId, MAX_PLANS_LISTED);
  const now = new Date();
  return plans.map((plan) => toPlanSummaryDto(plan, session.memberId, now));
}

export async function getPlanDetail(session: MemberSession, planId: string): Promise<PlanDetailDto> {
  const scope = toPlanScope(session, planId);
  const plan = await loadPlanOrThrow(scope);
  const { plans } = getUserRepositories();
  const [stops, checklist] = await Promise.all([plans.listStops(scope), plans.listChecklist(scope)]);
  return toPlanDetailDto(plan, stops, checklist, session.memberId, new Date());
}

export async function createPlan(session: MemberSession, input: CreatePlanBody): Promise<PlanDetailDto> {
  if (input.placeId) await requirePublishedPlace(input.placeId);

  const now = new Date();
  const isSecret = input.isSecret ?? false;
  const plan: DatePlan = {
    id: nanoid(21),
    roomId: session.roomId,
    createdBy: session.memberId,
    title: input.title,
    planDate: input.planDate,
    startTime: input.startTime,
    status: "planned",
    budget: input.budget ?? null,
    isSecret,
    revealAt: resolveRevealAt({
      isSecret,
      revealAt: input.revealAt,
      planDate: input.planDate,
      startTime: input.startTime,
    }),
    note: input.note ?? null,
    shareToken: null,
    shareExpiresAt: null,
    version: 1,
    createdAt: now,
    updatedAt: now,
    updatedBy: session.memberId,
  };

  const [h, m] = (input.startTime || "00:00").split(":").map(Number);
  const startMinute = (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);

  const firstStop = input.placeId
    ? {
        id: nanoid(21),
        roomId: session.roomId,
        placeId: input.placeId,
        customName: null,
        plannedTime: input.startTime,
        durationMin: DEFAULT_STOP_DURATION_MIN,
        dayOffset: 0,
        startMinute,
        travelMinutes: 15,
        isPinnedTime: false,
        note: null,
      }
    : null;

  await getUserRepositories().plans.insertPlan(plan, firstStop);
  if (firstStop) await getUserRepositories().swipes.syncPlannedMatches(session.roomId);
  return getPlanDetail(session, plan.id);
}

export async function updatePlan(session: MemberSession, planId: string, input: UpdatePlanBody): Promise<PlanDetailDto> {
  const plan = await loadEditablePlan(session, planId);
  assertNoConcurrentEdit(plan.updatedAt, input.expectedUpdatedAt);

  const { expectedUpdatedAt: _expected, ...fields } = input;
  const patch: PlanPatch = omitUndefined(fields);
  await getUserRepositories().plans.updatePlan(toPlanScope(session, planId), patch, toPlanTouch(session));
  return getPlanDetail(session, planId);
}

/** Hoàn tác 10 giây (F08) do client giữ lệnh xóa trước khi gọi API. */
export async function deletePlan(session: MemberSession, planId: string): Promise<void> {
  await loadEditablePlan(session, planId);
  await getUserRepositories().plans.deletePlanCascade(toPlanScope(session, planId));
  await getUserRepositories().swipes.syncPlannedMatches(session.roomId);
}

async function describeFirstStopLocation(stops: PlanStop[]): Promise<string | null> {
  const firstStop = stops[0];
  if (!firstStop) return null;
  if (!firstStop.placeId) return firstStop.customName;

  const place = (await getAllPublishedPlaces()).find((candidate) => candidate.id === firstStop.placeId);
  return place ? `${place.name}, ${place.area}` : firstStop.customName;
}

/** F08: file .ics nhắc trước 1 ngày và 2 giờ; kế hoạch bất ngờ đang khóa thì không xuất được. */
export async function exportPlanCalendar(session: MemberSession, planId: string): Promise<string> {
  const plan = await loadEditablePlan(session, planId);
  const stops = await getUserRepositories().plans.listStops(toPlanScope(session, planId));

  return generateIcsCalendar({
    id: plan.id,
    title: plan.title,
    planDate: plan.planDate,
    startTime: plan.startTime,
    durationMin: totalDurationMin(stops),
    note: plan.note,
    location: await describeFirstStopLocation(stops),
  });
}
