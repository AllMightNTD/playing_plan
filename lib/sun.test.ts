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
});
