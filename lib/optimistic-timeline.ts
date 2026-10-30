import type { PlanStopDto } from "@/server/services/user/plan.mapper";

export function reorderStopsOptimistic(stops: PlanStopDto[], fromIdx: number, toIdx: number): PlanStopDto[] {
  if (toIdx < 0 || toIdx >= stops.length || fromIdx === toIdx) return stops;
  const clone = [...stops];
  const [moved] = clone.splice(fromIdx, 1);
  clone.splice(toIdx, 0, moved);
  return clone.map((stop, idx) => ({ ...stop, sortOrder: idx }));
}

export function deleteStopOptimistic(stops: PlanStopDto[], stopId: string): PlanStopDto[] {
  return stops
    .filter((s) => s.id !== stopId)
    .map((stop, idx) => ({ ...stop, sortOrder: idx }));
}
