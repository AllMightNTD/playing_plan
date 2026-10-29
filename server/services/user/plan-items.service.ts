import { nanoid } from "nanoid";
import { getUserRepositories } from "@/server/db/repositories";
import { requirePublishedPlace } from "@/server/services/user/places.service";
import { loadEditablePlan, loadPlanOrThrow, toPlanScope, toPlanTouch } from "@/server/services/user/plan.service";
import { assertSameStopSet } from "@/server/services/user/plan.policy";
import {
  toChecklistItemDto,
  toPlanStopDto,
  type ChecklistItemDto,
  type PlanStopDto,
} from "@/server/services/user/plan.mapper";
import { DEFAULT_STOP_DURATION_MIN, MAX_CHECKLIST_ITEMS, MAX_PLAN_STOPS } from "@/lib/constants/user";
import { omitUndefined } from "@/lib/utils";
import { AppError, ERRORS } from "@/server/http/errors";
import type { MemberSession } from "@/server/db/repositories/types";
import type {
  AddStopBody,
  CreateChecklistItemBody,
  UpdateChecklistItemBody,
  UpdateStopBody,
} from "@/lib/validators/user";

/** Người được giao việc phải là thiết bị đang hoạt động trong cùng phòng. */
async function assertAssigneeInRoom(session: MemberSession, assignedTo: string | null | undefined): Promise<void> {
  if (!assignedTo) return;
  const room = await getUserRepositories().rooms.getRoomOverview(session.roomId);
  if (!room?.members.some((member) => member.id === assignedTo)) {
    throw new AppError(ERRORS.ROOM.MEMBER_NOT_FOUND);
  }
}

export async function addStop(session: MemberSession, planId: string, input: AddStopBody): Promise<PlanStopDto> {
  await loadEditablePlan(session, planId);
  if (input.placeId) await requirePublishedPlace(input.placeId);

  const [h, m] = (input.plannedTime || "00:00").split(":").map(Number);
  const startMinute = (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);

  const stop = await getUserRepositories().plans.insertStopWithinLimit(
    toPlanScope(session, planId),
    {
      id: nanoid(21),
      roomId: session.roomId,
      placeId: input.placeId ?? null,
      customName: input.customName ?? null,
      plannedTime: input.plannedTime ?? null,
      durationMin: input.durationMin ?? DEFAULT_STOP_DURATION_MIN,
      dayOffset: 0,
      startMinute,
      travelMinutes: 15,
      isPinnedTime: false,
      note: input.note ?? null,
    },
    MAX_PLAN_STOPS,
    toPlanTouch(session)
  );
  if (!stop) throw new AppError(ERRORS.PLAN.STOP_LIMIT_REACHED);
  if (stop.placeId) await getUserRepositories().swipes.syncPlannedMatches(session.roomId);
  return toPlanStopDto(stop);
}

export async function updateStop(
  session: MemberSession,
  planId: string,
  stopId: string,
  input: UpdateStopBody
): Promise<void> {
  await loadEditablePlan(session, planId);
  const updated = await getUserRepositories().plans.updateStop(
    toPlanScope(session, planId),
    stopId,
    omitUndefined(input),
    toPlanTouch(session)
  );
  if (!updated) throw new AppError(ERRORS.PLAN.STOP_NOT_FOUND);
}

export async function reorderStops(session: MemberSession, planId: string, stopIds: string[]): Promise<void> {
  await loadEditablePlan(session, planId);
  const scope = toPlanScope(session, planId);
  const { plans } = getUserRepositories();

  const currentStops = await plans.listStops(scope);
  assertSameStopSet(
    currentStops.map((stop) => stop.id),
    stopIds
  );
  await plans.reorderStops(scope, stopIds, toPlanTouch(session));
}

export async function deleteStop(session: MemberSession, planId: string, stopId: string): Promise<void> {
  await loadEditablePlan(session, planId);
  const deleted = await getUserRepositories().plans.deleteStop(toPlanScope(session, planId), stopId, toPlanTouch(session));
  if (!deleted) throw new AppError(ERRORS.PLAN.STOP_NOT_FOUND);
  await getUserRepositories().swipes.syncPlannedMatches(session.roomId);
}

/** Checklist là phần chuẩn bị chung (F10, F19) nên vẫn sửa được khi kế hoạch bất ngờ đang khóa. */
export async function addChecklistItem(
  session: MemberSession,
  planId: string,
  input: CreateChecklistItemBody
): Promise<ChecklistItemDto> {
  await loadPlanOrThrow(toPlanScope(session, planId));
  await assertAssigneeInRoom(session, input.assignedTo);

  const item = await getUserRepositories().plans.insertChecklistItemWithinLimit(
    toPlanScope(session, planId),
    { id: nanoid(21), content: input.content, isDone: false, assignedTo: input.assignedTo ?? null },
    MAX_CHECKLIST_ITEMS,
    toPlanTouch(session)
  );
  if (!item) throw new AppError(ERRORS.PLAN.CHECKLIST_LIMIT_REACHED);
  return toChecklistItemDto(item);
}

export async function updateChecklistItem(
  session: MemberSession,
  planId: string,
  itemId: string,
  input: UpdateChecklistItemBody
): Promise<void> {
  await loadPlanOrThrow(toPlanScope(session, planId));
  await assertAssigneeInRoom(session, input.assignedTo);

  const updated = await getUserRepositories().plans.updateChecklistItem(
    toPlanScope(session, planId),
    itemId,
    omitUndefined(input),
    toPlanTouch(session)
  );
  if (!updated) throw new AppError(ERRORS.PLAN.CHECKLIST_ITEM_NOT_FOUND);
}

export async function deleteChecklistItem(session: MemberSession, planId: string, itemId: string): Promise<void> {
  await loadPlanOrThrow(toPlanScope(session, planId));
  const deleted = await getUserRepositories().plans.deleteChecklistItem(
    toPlanScope(session, planId),
    itemId,
    toPlanTouch(session)
  );
  if (!deleted) throw new AppError(ERRORS.PLAN.CHECKLIST_ITEM_NOT_FOUND);
}
