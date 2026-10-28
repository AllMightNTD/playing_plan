import { getMemoryStore } from "@/server/db/demo/memory-store";
import type { ChecklistItem, DatePlan, PlanStop } from "@/server/db/schema";
import type { PlanRepository, PlanScope, PlanTouch } from "@/server/db/repositories/types";

function findScopedPlan(scope: PlanScope): DatePlan | null {
  const plan = getMemoryStore().plans.get(scope.planId);
  return plan && plan.roomId === scope.roomId ? plan : null;
}

function touchPlan(plan: DatePlan, touch: PlanTouch): void {
  plan.updatedAt = touch.at;
  plan.updatedBy = touch.by;
}

/** Trả về bản sao để caller không sửa ngầm được dữ liệu trong store (giống đọc từ DB). */
function cloneSorted<T extends { sortOrder: number }>(items: T[] | undefined): T[] {
  return (items ?? []).map((item) => ({ ...item })).sort((a, b) => a.sortOrder - b.sortOrder);
}

function compact<T extends { sortOrder: number }>(items: T[]): void {
  items.sort((a, b) => a.sortOrder - b.sortOrder).forEach((item, index) => (item.sortOrder = index));
}

function getChildList<T>(map: Map<string, T[]>, planId: string): T[] {
  const list = map.get(planId) ?? [];
  map.set(planId, list);
  return list;
}

export const memoryPlanRepository: PlanRepository = {
  async listByRoom(roomId, limit) {
    return [...getMemoryStore().plans.values()]
      .filter((plan) => plan.roomId === roomId)
      .sort((a, b) => `${b.planDate} ${b.startTime}`.localeCompare(`${a.planDate} ${a.startTime}`))
      .slice(0, limit)
      .map((plan) => ({ ...plan }));
  },

  async findById(scope) {
    const plan = findScopedPlan(scope);
    return plan ? { ...plan } : null;
  },

  async listStops(scope) {
    return findScopedPlan(scope) ? cloneSorted(getMemoryStore().stopsByPlan.get(scope.planId)) : [];
  },

  async listChecklist(scope) {
    return findScopedPlan(scope) ? cloneSorted(getMemoryStore().checklistByPlan.get(scope.planId)) : [];
  },

  async insertPlan(plan, firstStop) {
    const store = getMemoryStore();
    store.plans.set(plan.id, { ...plan });
    store.stopsByPlan.set(plan.id, firstStop ? [{ ...firstStop, planId: plan.id, sortOrder: 0 }] : []);
    store.checklistByPlan.set(plan.id, []);
  },

  async updatePlan(scope, patch, touch) {
    const plan = findScopedPlan(scope);
    if (!plan) return;
    Object.assign(plan, patch);
    touchPlan(plan, touch);
  },

  async deletePlanCascade(scope) {
    if (!findScopedPlan(scope)) return;
    const store = getMemoryStore();
    store.plans.delete(scope.planId);
    store.stopsByPlan.delete(scope.planId);
    store.checklistByPlan.delete(scope.planId);
  },

  async insertStopWithinLimit(scope, stop, maxStops, touch) {
    const plan = findScopedPlan(scope);
    if (!plan) return null;
    const stops = getChildList(getMemoryStore().stopsByPlan, scope.planId);
    if (stops.length >= maxStops) return null;

    const created: PlanStop = { ...stop, planId: scope.planId, sortOrder: stops.length };
    stops.push(created);
    touchPlan(plan, touch);
    return { ...created };
  },

  async updateStop(scope, stopId, patch, touch) {
    const plan = findScopedPlan(scope);
    const stop = plan && getMemoryStore().stopsByPlan.get(scope.planId)?.find((s) => s.id === stopId);
    if (!plan || !stop) return false;
    Object.assign(stop, patch);
    touchPlan(plan, touch);
    return true;
  },

  async reorderStops(scope, orderedStopIds, touch) {
    const plan = findScopedPlan(scope);
    if (!plan) return;
    const stops = getChildList(getMemoryStore().stopsByPlan, scope.planId);
    const position = new Map(orderedStopIds.map((id, index) => [id, index]));
    stops.forEach((stop) => (stop.sortOrder = position.get(stop.id) ?? stop.sortOrder));
    touchPlan(plan, touch);
  },

  async deleteStop(scope, stopId, touch) {
    const plan = findScopedPlan(scope);
    if (!plan) return false;
    const stops = getChildList(getMemoryStore().stopsByPlan, scope.planId);
    const index = stops.findIndex((stop) => stop.id === stopId);
    if (index === -1) return false;

    stops.splice(index, 1);
    compact(stops);
    touchPlan(plan, touch);
    return true;
  },

  async insertChecklistItemWithinLimit(scope, item, maxItems, touch) {
    const plan = findScopedPlan(scope);
    if (!plan) return null;
    const items = getChildList(getMemoryStore().checklistByPlan, scope.planId);
    if (items.length >= maxItems) return null;

    const created: ChecklistItem = { ...item, planId: scope.planId, sortOrder: items.length };
    items.push(created);
    touchPlan(plan, touch);
    return { ...created };
  },

  async updateChecklistItem(scope, itemId, patch, touch) {
    const plan = findScopedPlan(scope);
    const item = plan && getMemoryStore().checklistByPlan.get(scope.planId)?.find((i) => i.id === itemId);
    if (!plan || !item) return false;
    Object.assign(item, patch);
    touchPlan(plan, touch);
    return true;
  },

  async deleteChecklistItem(scope, itemId, touch) {
    const plan = findScopedPlan(scope);
    if (!plan) return false;
    const items = getChildList(getMemoryStore().checklistByPlan, scope.planId);
    const index = items.findIndex((item) => item.id === itemId);
    if (index === -1) return false;

    items.splice(index, 1);
    compact(items);
    touchPlan(plan, touch);
    return true;
  },
};
