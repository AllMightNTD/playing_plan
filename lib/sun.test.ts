import { describe, it, expect } from "vitest";
import { getBestTimes, VN_TIME_ZONE } from "./sun";

describe("SunCalc Giờ vàng & giờ xanh (F13)", () => {
  it("tính giờ vàng và giờ xanh cho Hà Nội theo múi giờ Asia/Ho_Chi_Minh", () => {
    // 21.0285° N, 105.8542° E (Trung tâm Hà Nội)
    const fixedDate = new Date("2026-10-27T12:00:00Z");
    const times = getBestTimes(21.0285, 105.8542, fixedDate);

    expect(VN_TIME_ZONE).toBe("Asia/Ho_Chi_Minh");
    expect(times.sunrise).toMatch(/^\d{2}:\d{2}$/);
    expect(times.sunset).toMatch(/^\d{2}:\d{2}$/);
    expect(times.goldenHourMorning.start).toBe(times.sunrise);
    expect(times.goldenHourEvening.end).toBe(times.sunset);
    expect(times.blueHour.start).toBe(times.sunset);
  });

  it("đối soát 12 ngày mẫu rải đều các tháng trong năm (15/1..15/12) tại Hà Nội", () => {
    // Đối soát theo lịch thiên văn Hà Nội (chênh lệch <= ±5 phút)
    const expectedSunsets = [
      { month: 1, expected: "17:36" },
      { month: 2, expected: "17:55" },
      { month: 3, expected: "18:07" },
      { month: 4, expected: "18:16" },
      { month: 5, expected: "18:28" },
      { month: 6, expected: "18:40" },
      { month: 7, expected: "18:42" },
      { month: 8, expected: "18:28" },
      { month: 9, expected: "18:01" },
      { month: 10, expected: "17:34" },
      { month: 11, expected: "17:16" },
      { month: 12, expected: "17:18" },
    ];

    for (const { month, expected } of expectedSunsets) {
      const sampleDate = new Date(Date.UTC(2026, month - 1, 15, 5, 0, 0));
      const times = getBestTimes(21.0285, 105.8542, sampleDate);
      expect(times.sunset, `Tháng ${month} hoàng hôn Hà Nội phải khớp`).toBe(expected);
    }
  });
});
