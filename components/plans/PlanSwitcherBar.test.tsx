import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import { PlanSwitcherBar } from "./PlanSwitcherBar";
import type { PlanSummaryDto } from "@/server/services/user/plan.mapper";

describe("components/plans/PlanSwitcherBar", () => {
  const createMockPlan = (overrides: Partial<PlanSummaryDto>): PlanSummaryDto => ({
    id: "plan-id",
    title: "Buổi hẹn hò",
    planDate: "2026-11-15",
    startTime: "16:00",
    status: "planned",
    budget: null,
    note: null,
    isSecret: false,
    isSecretLocked: false,
    revealAt: null,
    version: 1,
    shareToken: null,
    shareExpiresAt: null,
    createdBy: "user-1",
    updatedAt: new Date("2026-11-01T00:00:00Z"),
    updatedBy: null,
    ...overrides,
  });

  const mockPlans: PlanSummaryDto[] = [
    createMockPlan({
      id: "plan-1",
      title: "Chiều Thu Hồ Tây",
      planDate: "2026-11-15",
      startTime: "16:00",
      status: "planned",
      isSecret: false,
    }),
    createMockPlan({
      id: "plan-2",
      title: "Phố Cổ Chiều Mưa",
      planDate: "2026-11-22",
      startTime: "15:30",
      status: "planned",
      isSecret: true,
    }),
    createMockPlan({
      id: "plan-3",
      title: "Cà Phê Đường Tàu",
      planDate: "2026-10-20",
      startTime: "09:00",
      status: "done",
      isSecret: false,
    }),
  ];

  it("renders 2-tier plan switcher with status tabs, create button, and horizontal chips carousel", () => {
    const html = renderToString(
      <PlanSwitcherBar
        plans={mockPlans}
        selectedPlanId="plan-1"
        filterTab="upcoming"
        onChangeFilterTab={vi.fn()}
        onSelectPlan={vi.fn()}
        onOpenCreateModal={vi.fn()}
      />
    );

    // Filter tabs
    expect(html).toContain("Sắp tới");
    expect(html).toContain("Đã đi");

    // Create action
    expect(html).toContain("Tạo hẹn");

    // Plan chips
    expect(html).toContain("Chiều Thu Hồ Tây");
    expect(html).toContain("Phố Cổ Chiều Mưa");
    expect(html).toContain("app-horizontal-carousel");
  });
});
