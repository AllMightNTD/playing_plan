import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db, type DbExecutor } from "@/server/db/client";
import {
  checklistItems,
  datePlans,
  memories,
  memoryPhotos,
  planRsvps,
  planStops,
  reminders,
} from "@/server/db/schema";
import type {
  PlanRepository,
  PlanRsvpRecord,
  PlanScope,
  PlanTouch,
} from "@/server/db/repositories/types";

/** Subquery chặn IDOR ở tầng DAL: bảng con chỉ được chạm khi kế hoạch thuộc đúng phòng. */
function ownedPlanIds(executor: DbExecutor, scope: PlanScope) {
  return executor
    .select({ id: datePlans.id })
    .from(datePlans)
    .where(
      and(eq(datePlans.id, scope.planId), eq(datePlans.roomId, scope.roomId)),
    );
}

function isScopedPlan(scope: PlanScope) {
  return and(
    eq(datePlans.id, scope.planId),
    eq(datePlans.roomId, scope.roomId),
  );
}

async function touchPlan(
  executor: DbExecutor,
  scope: PlanScope,
  touch: PlanTouch,
): Promise<void> {
  await executor
    .update(datePlans)
    .set({ updatedAt: touch.at, updatedBy: touch.by })
    .where(isScopedPlan(scope));
}

/** Đánh lại sort_order liên tục 0..n-1 sau khi xóa phần tử. */
async function compactSortOrder(
  executor: DbExecutor,
  table: typeof planStops | typeof checklistItems,
  scope: PlanScope,
): Promise<void> {
  const rows = await executor
    .select({ id: table.id, sortOrder: table.sortOrder })
    .from(table)
    .where(inArray(table.planId, ownedPlanIds(executor, scope)))
    .orderBy(asc(table.sortOrder));

  for (const [index, row] of rows.entries()) {
    if (row.sortOrder === index) continue;
    await executor
      .update(table)
      .set({ sortOrder: index })
      .where(eq(table.id, row.id));
  }
}

export const drizzlePlanRepository: PlanRepository = {
  async listByRoom(roomId, limit) {
    return db
      .select()
      .from(datePlans)
      .where(eq(datePlans.roomId, roomId))
      .orderBy(desc(datePlans.planDate), desc(datePlans.startTime))
      .limit(limit);
  },

  async findById(scope) {
    const [plan] = await db
      .select()
      .from(datePlans)
      .where(isScopedPlan(scope))
      .limit(1);
    return plan ?? null;
  },

  async findByShareToken(shareToken) {
    const [plan] = await db
      .select()
      .from(datePlans)
      .where(eq(datePlans.shareToken, shareToken))
      .limit(1);
    return plan ?? null;
  },

  async listStops(scope) {
    return db
      .select()
      .from(planStops)
      .where(inArray(planStops.planId, ownedPlanIds(db, scope)))
      .orderBy(asc(planStops.sortOrder));
  },

  async listChecklist(scope) {
    return db
      .select()
      .from(checklistItems)
      .where(inArray(checklistItems.planId, ownedPlanIds(db, scope)))
      .orderBy(asc(checklistItems.sortOrder));
  },

  async insertPlan(plan, firstStop) {
    await db.transaction(async (tx) => {
      await tx.insert(datePlans).values(plan);
      if (firstStop) {
        await tx
          .insert(planStops)
          .values({ ...firstStop, planId: plan.id, sortOrder: 0 });
      }
    });
  },

  async updatePlan(scope, patch, touch) {
    await db
      .update(datePlans)
      .set({ ...patch, updatedAt: touch.at, updatedBy: touch.by })
      .where(isScopedPlan(scope));
  },

  async deletePlanCascade(scope) {
    await db.transaction(async (tx) => {
      const planIds = ownedPlanIds(tx, scope);
      const planMemoryIds = tx
        .select({ id: memories.id })
        .from(memories)
        .where(inArray(memories.planId, planIds));

      await tx
        .delete(checklistItems)
        .where(inArray(checklistItems.planId, planIds));
      await tx.delete(planStops).where(inArray(planStops.planId, planIds));
      await tx.delete(reminders).where(inArray(reminders.planId, planIds));
      await tx
        .delete(memoryPhotos)
        .where(inArray(memoryPhotos.memoryId, planMemoryIds));
      await tx
        .delete(memories)
        .where(
          and(
            eq(memories.planId, scope.planId),
            eq(memories.roomId, scope.roomId),
          ),
        );
      await tx.delete(datePlans).where(isScopedPlan(scope));
    });
  },

  async insertStopWithinLimit(scope, stop, maxStops, touch) {
    return db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: planStops.id })
        .from(planStops)
        .where(inArray(planStops.planId, ownedPlanIds(tx, scope)));
      if (existing.length >= maxStops) return null;

      const created = {
        ...stop,
        planId: scope.planId,
        sortOrder: existing.length,
      };
      await tx.insert(planStops).values(created);
      await touchPlan(tx, scope, touch);
      return created;
    });
  },

  async updateStop(scope, stopId, patch, touch) {
    return db.transaction(async (tx) => {
      const [stop] = await tx
        .select({ id: planStops.id })
        .from(planStops)
        .where(
          and(
            eq(planStops.id, stopId),
            inArray(planStops.planId, ownedPlanIds(tx, scope)),
          ),
        )
        .limit(1);
      if (!stop) return false;

      await tx.update(planStops).set(patch).where(eq(planStops.id, stop.id));
      await touchPlan(tx, scope, touch);
      return true;
    });
  },

  async reorderStops(scope, orderedStopIds, touch) {
    await db.transaction(async (tx) => {
      for (const [index, stopId] of orderedStopIds.entries()) {
        await tx
          .update(planStops)
          .set({ sortOrder: index })
          .where(
            and(
              eq(planStops.id, stopId),
              inArray(planStops.planId, ownedPlanIds(tx, scope)),
            ),
          );
      }
      await touchPlan(tx, scope, touch);
    });
  },

  async deleteStop(scope, stopId, touch) {
    return db.transaction(async (tx) => {
      const result = await tx
        .delete(planStops)
        .where(
          and(
            eq(planStops.id, stopId),
            inArray(planStops.planId, ownedPlanIds(tx, scope)),
          ),
        );
      if (result.rowsAffected !== 1) return false;

      await compactSortOrder(tx, planStops, scope);
      await touchPlan(tx, scope, touch);
      return true;
    });
  },

  async insertChecklistItemWithinLimit(scope, item, maxItems, touch) {
    return db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: checklistItems.id })
        .from(checklistItems)
        .where(inArray(checklistItems.planId, ownedPlanIds(tx, scope)));
      if (existing.length >= maxItems) return null;

      const created = {
        ...item,
        planId: scope.planId,
        sortOrder: existing.length,
      };
      await tx.insert(checklistItems).values(created);
      await touchPlan(tx, scope, touch);
      return created;
    });
  },

  async updateChecklistItem(scope, itemId, patch, touch) {
    return db.transaction(async (tx) => {
      const [item] = await tx
        .select({ id: checklistItems.id })
        .from(checklistItems)
        .where(
          and(
            eq(checklistItems.id, itemId),
            inArray(checklistItems.planId, ownedPlanIds(tx, scope)),
          ),
        )
        .limit(1);
      if (!item) return false;

      await tx
        .update(checklistItems)
        .set(patch)
        .where(eq(checklistItems.id, item.id));
      await touchPlan(tx, scope, touch);
      return true;
    });
  },

  async deleteChecklistItem(scope, itemId, touch) {
    return db.transaction(async (tx) => {
      const result = await tx
        .delete(checklistItems)
        .where(
          and(
            eq(checklistItems.id, itemId),
            inArray(checklistItems.planId, ownedPlanIds(tx, scope)),
          ),
        );
      if (result.rowsAffected !== 1) return false;

      await compactSortOrder(tx, checklistItems, scope);
      await touchPlan(tx, scope, touch);
      return true;
    });
  },

  async saveRsvp(rsvp) {
    await db.insert(planRsvps).values({
      id: rsvp.id,
      planId: rsvp.planId,
      roomId: rsvp.roomId,
      responderName: rsvp.responderName,
      status: rsvp.status,
      changeNote: rsvp.changeNote,
      createdAt: rsvp.createdAt,
    });
  },

  async listRsvps(planId) {
    const rows = await db
      .select()
      .from(planRsvps)
      .where(eq(planRsvps.planId, planId))
      .orderBy(desc(planRsvps.createdAt));

    return rows.map((r) => ({
      id: r.id,
      planId: r.planId,
      roomId: r.roomId,
      responderName: r.responderName,
      status: r.status,
      changeNote: r.changeNote,
      createdAt: r.createdAt,
    }));
  },

  async atomicShiftSchedule(scope, expectedVersion, stopUpdates, touch) {
    return db.transaction(async (tx) => {
      const planUpdate = await tx
        .update(datePlans)
        .set({
          version: sql`${datePlans.version} + 1`,
          updatedAt: touch.at,
          updatedBy: touch.by,
        })
        .where(and(isScopedPlan(scope), eq(datePlans.version, expectedVersion)));

      const affected = (planUpdate as unknown as [{ affectedRows?: number }])?.[0]?.affectedRows ?? (planUpdate as unknown as { rowsAffected?: number })?.rowsAffected ?? 0;
      if (affected === 0) {
        return false;
      }

      for (const update of stopUpdates) {
        await tx
          .update(planStops)
          .set({
            plannedTime: update.plannedTime,
            startMinute: update.startMinute,
            dayOffset: update.dayOffset,
            ...(update.travelMinutes !== undefined ? { travelMinutes: update.travelMinutes } : {}),
          })
          .where(
            and(
              eq(planStops.id, update.id),
              eq(planStops.planId, scope.planId),
              eq(planStops.roomId, scope.roomId)
            )
          );
      }

      return true;
    });
  },

  async updateStopsBatch(scope, expectedVersion, stopUpdates, touch) {
    return db.transaction(async (tx) => {
      const planUpdate = await tx
        .update(datePlans)
        .set({
          version: sql`${datePlans.version} + 1`,
          updatedAt: touch.at,
          updatedBy: touch.by,
        })
        .where(and(isScopedPlan(scope), eq(datePlans.version, expectedVersion)));

      const affected = (planUpdate as unknown as [{ affectedRows?: number }])?.[0]?.affectedRows ?? (planUpdate as unknown as { rowsAffected?: number })?.rowsAffected ?? 0;
      if (affected === 0) {
        return false;
      }

      for (const update of stopUpdates) {
        const patch: Record<string, unknown> = {};
        if (update.placeId !== undefined) patch.placeId = update.placeId;
        if (update.customName !== undefined) patch.customName = update.customName;
        if (update.plannedTime !== undefined) patch.plannedTime = update.plannedTime;
        if (update.startMinute !== undefined) patch.startMinute = update.startMinute;
        if (update.travelMinutes !== undefined) patch.travelMinutes = update.travelMinutes;
        if (update.isPinnedTime !== undefined) patch.isPinnedTime = update.isPinnedTime;
        if (update.note !== undefined) patch.note = update.note;

        await tx
          .update(planStops)
          .set(patch)
          .where(
            and(
              eq(planStops.id, update.id),
              eq(planStops.planId, scope.planId),
              eq(planStops.roomId, scope.roomId)
            )
          );
      }

      return true;
    });
  },
};
