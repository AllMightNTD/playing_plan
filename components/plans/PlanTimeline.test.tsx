import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import { PlanTimeline } from "./PlanTimeline";
import type { PlanDetailDto } from "@/server/services/user/plan.mapper";

describe("components/plans/PlanTimeline", () => {
  const mockPlan: PlanDetailDto = {
    id: "plan-test-1",
    title: "Buổi hẹn cuối tuần phố cổ",
    planDate: "2026-11-01",
    startTime: "15:00",
    status: "planned",
    budget: 500000,
    note: "Mặc đồ tone be",
    isSecret: false,
    isSecretLocked: false,
    revealAt: null,
    version: 1,
    shareToken: null,
    shareExpiresAt: null,
    createdBy: "user1",
    updatedAt: new Date(),
    updatedBy: null,
    stops: [
      {
        id: "stop-1",
        placeId: "p1",
        customName: "Là Việt Coffee",
        sortOrder: 0,
        plannedTime: null,
        durationMin: 60,
        dayOffset: 0,
        startMinute: 900,
        travelMinutes: 0,
        isPinnedTime: false,
        note: "Ngồi ban công tầng 2",
      },
      {
        id: "stop-2",
        placeId: "p2",
        customName: "Hồ Tây - Phố Từ Hoa",
        sortOrder: 1,
        plannedTime: "16:20",
        durationMin: 45,
        dayOffset: 0,
        startMinute: 980,
        travelMinutes: 20,
        isPinnedTime: true,
        note: "Ngắm hoàng hôn",
      },
    ],
    checklist: [
      {
        id: "check-1",
        content: "Mang máy ảnh film",
        isDone: true,
        assignedTo: "user1",
        sortOrder: 0,
      },
      {
        id: "check-2",
        content: "Đặt bàn trước",
        isDone: false,
        assignedTo: null,
        sortOrder: 1,
      },
    ],
  };

  const mockPlaces = [
    {
      id: "p1",
      name: "Là Việt Coffee",
      slug: "la-viet-coffee",
      category: "coffee" as const,
      area: "Đống Đa",
      address: "Đống Đa, Hà Nội",
      lat: 21.0125,
      lng: 105.8265,
      indoor: true,
    },
    {
      id: "p2",
      name: "Hồ Tây - Phố Từ Hoa",
      slug: "ho-tay-tu-hoa",
      category: "activity" as const,
      area: "Tây Hồ",
      address: "Tây Hồ, Hà Nội",
      lat: 21.0585,
      lng: 105.8295,
      indoor: false,
    },
  ] as unknown as import("@/lib/types/catalog").HanoiPlace[];

  it("renders plan title, date badge, stops and checklist count", () => {
    const html = renderToString(
      <PlanTimeline
        plan={mockPlan}
        places={mockPlaces}
        onRefresh={vi.fn().mockResolvedValue(undefined)}
      />
    );

    // Title & date assertions
    expect(html).toContain("Buổi hẹn cuối tuần phố cổ");
    expect(html).toContain("Bắt đầu 15:00");
    expect(html).toContain("CN, 01/11");

    // Stops assertions
    expect(html).toContain("Là Việt Coffee");
    expect(html).toContain("Hồ Tây - Phố Từ Hoa");
    expect(html).toContain("Ngồi ban công tầng 2");
    expect(html).toContain("Ngắm hoàng hôn");
    expect(html).toContain("📌 Cố định giờ");

    // Checklist button assertion
    expect(html).toContain("1/2 xong");

    // Action buttons assertion
    expect(html).toContain("Lưu vào Lịch ĐT (.ics)");
  });

  it("handles empty stops gracefully", () => {
    const emptyPlan: PlanDetailDto = {
      ...mockPlan,
      stops: [],
      checklist: [],
    };

    const html = renderToString(
      <PlanTimeline
        plan={emptyPlan}
        onRefresh={vi.fn().mockResolvedValue(undefined)}
      />
    );

    expect(html).toContain("Chưa có địa điểm nào trong lịch hẹn này.");
    expect(html).toContain("+ Thêm địa điểm đầu tiên");
  });
});
