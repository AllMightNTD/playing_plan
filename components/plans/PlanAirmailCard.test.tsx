import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { PlanAirmailCard } from "./PlanAirmailCard";

describe("components/plans/PlanAirmailCard", () => {
  const mockTimeline = [
    {
      id: "stop-1",
      name: "420 Lab",
      startTimeStr: "15:00",
      endTimeStr: "16:00",
      distKm: 0,
      travelMins: 0,
      icon: "☕",
    },
    {
      id: "stop-2",
      name: "Bảo Tàng Mỹ Thuật",
      startTimeStr: "16:15",
      endTimeStr: "17:25",
      distKm: 1.6,
      travelMins: 15,
      icon: "📸",
    },
  ];

  const mockStats = {
    totalKm: "1.6",
    totalDurationStr: "2h 25p",
    startStr: "15:00",
    endStr: "17:25",
  };

  it("renders weather and SunCalc golden hour information", () => {
    const html = renderToString(
      <PlanAirmailCard
        planId="plan-123"
        planDate="2026-11-01"
        planNote="Mang theo áo khoác mỏng"
        weather={{
          temp: 29,
          description: "Mát mẻ dễ chịu",
          rainProb: 20,
          icon: "🌤️",
          weatherTip: "Thời tiết lý tưởng cho buổi hẹn!",
        }}
        sun={{
          goldenHour: { start: "16:20", end: "17:20" },
          blueHour: { start: "17:20", end: "17:50" },
        }}
        partner={{
          name: "Bé iu",
          phone: "0912345678",
          email: "beiu@test.com",
          lastSync: "1 phút trước",
        }}
        computedTimeline={mockTimeline}
        itineraryStats={mockStats}
      />
    );

    // Weather assertions
    expect(html).toContain("29°C");
    expect(html).toContain("Mát mẻ dễ chịu");
    expect(html).toContain("20%");
    expect(html).toContain("16:20 - 17:20");
    expect(html).toContain("17:20 - 17:50");
    expect(html).toContain("Thời tiết lý tưởng cho buổi hẹn!");

    // Partner assertions
    expect(html).toContain("Bé iu");
    expect(html).toContain("0912345678");
    expect(html).toContain("beiu@test.com");

    // General note assertion
    expect(html).toContain("Mang theo áo khoác mỏng");

    // Timeline summary assertions
    expect(html).toContain("420 Lab");
    expect(html).toContain("Bảo Tàng Mỹ Thuật");
    expect(html).toContain("1.6 km");
    expect(html).toContain("2h 25p");

    // Attribution
    expect(html).toContain("Open-Meteo (CC-BY 4.0)");
  });

  it("handles fallback defaults gracefully when optional props are missing", () => {
    const html = renderToString(
      <PlanAirmailCard
        planId="plan-empty"
        planDate="2026-11-01"
        computedTimeline={[]}
        itineraryStats={{
          totalKm: "0.0",
          totalDurationStr: "0 giờ",
          startStr: "--:--",
          endStr: "--:--",
        }}
      />
    );

    expect(html).toContain("DỰ BÁO HẸN HÒ HÀ NỘI");
    expect(html).toContain("Chưa có chặng dừng nào trong kế hoạch.");
    expect(html).toContain("Người thương 💕");
    expect(html).toContain("Chưa thêm SĐT");
    expect(html).toContain("Chưa thêm Email");
  });
});
