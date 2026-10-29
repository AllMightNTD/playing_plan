import { describe, expect, it } from "vitest";
import {
  calculateHaversineDistanceKm,
  getHanoiAverageSpeedKmh,
  calculateHanoiTravelMinutes,
} from "./travel-time";

describe("Hanoi Motorbike Travel Time & Route Optimization (Section 2.13)", () => {
  const hoanKiem = { lat: 21.0285, lng: 105.8542 };
  const hoTay = { lat: 21.055, lng: 105.825 };

  it("should calculate Haversine distance correctly between Hoan Kiem and West Lake", () => {
    const dist = calculateHaversineDistanceKm(hoanKiem, hoTay);
    // Khoảng 4.2 km
    expect(dist).toBeGreaterThan(3.5);
    expect(dist).toBeLessThan(5.0);
  });

  it("should adjust average speed according to Hanoi rush hours", () => {
    // 08:00 (480 phút) -> Giờ cao điểm sáng: 15 km/h
    expect(getHanoiAverageSpeedKmh(480)).toBe(15);

    // 18:00 (1080 phút) -> Giờ cao điểm chiều: 15 km/h
    expect(getHanoiAverageSpeedKmh(1080)).toBe(15);

    // 10:00 (600 phút) -> Giờ bình thường: 25 km/h
    expect(getHanoiAverageSpeedKmh(600)).toBe(25);

    // 14:30 (870 phút) -> Giờ bình thường: 25 km/h
    expect(getHanoiAverageSpeedKmh(870)).toBe(25);

    // 21:00 (1260 phút) -> Giờ bình thường: 25 km/h
    expect(getHanoiAverageSpeedKmh(1260)).toBe(25);
  });

  it("should calculate travel minutes with 1.35 road factor and 10 mins parking buffer", () => {
    // Đi vào giờ cao điểm chiều (17:30 = 1050)
    const rushHourResult = calculateHanoiTravelMinutes(hoanKiem, hoTay, 1050);
    expect(rushHourResult.speedKmh).toBe(15);
    expect(rushHourResult.bufferMinutes).toBe(10);
    // (4.2 * 1.35 / 15) * 60 + 10 ~= 22.7 + 10 = ~33 phút
    expect(rushHourResult.travelMinutes).toBeGreaterThanOrEqual(30);

    // Đi vào giờ thường (14:00 = 840)
    const normalHourResult = calculateHanoiTravelMinutes(hoanKiem, hoTay, 840);
    expect(normalHourResult.speedKmh).toBe(25);
    // (4.2 * 1.35 / 25) * 60 + 10 ~= 13.6 + 10 = ~24 phút
    expect(normalHourResult.travelMinutes).toBeLessThan(rushHourResult.travelMinutes);
  });

  it("should return 0 minutes for identical locations", () => {
    const result = calculateHanoiTravelMinutes(hoanKiem, hoanKiem, 600);
    expect(result.travelMinutes).toBe(0);
    expect(result.distanceKm).toBe(0);
  });
});
