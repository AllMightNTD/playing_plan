import { describe, it, expect } from "vitest";
import { reorderStopsOptimistic, deleteStopOptimistic } from "./optimistic-timeline";
import type { PlanStopDto } from "@/server/services/user/plan.mapper";

const mockStops: PlanStopDto[] = [
  { id: "s1", placeId: "p1", customName: "Trạm 1", sortOrder: 0, plannedTime: null, note: null, durationMin: 60, dayOffset: 0, startMinute: 0, travelMinutes: 0, isPinnedTime: false },
  { id: "s2", placeId: "p2", customName: "Trạm 2", sortOrder: 1, plannedTime: null, note: null, durationMin: 60, dayOffset: 0, startMinute: 0, travelMinutes: 0, isPinnedTime: false },
  { id: "s3", placeId: "p3", customName: "Trạm 3", sortOrder: 2, plannedTime: null, note: null, durationMin: 60, dayOffset: 0, startMinute: 0, travelMinutes: 0, isPinnedTime: false },
];

describe("optimistic-timeline", () => {
  it("reorderStopsOptimistic hoán đổi vị trí 2 trạm hợp lệ", () => {
    const updated = reorderStopsOptimistic(mockStops, 0, 1);
    expect(updated[0].id).toBe("s2");
    expect(updated[1].id).toBe("s1");
    expect(updated[0].sortOrder).toBe(0);
    expect(updated[1].sortOrder).toBe(1);
  });

  it("deleteStopOptimistic xóa đúng trạm và cập nhật lại sortOrder", () => {
    const updated = deleteStopOptimistic(mockStops, "s2");
    expect(updated.length).toBe(2);
    expect(updated.map((s) => s.id)).toEqual(["s1", "s3"]);
    expect(updated[1].sortOrder).toBe(1);
  });
});
