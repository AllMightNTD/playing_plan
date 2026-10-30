import { describe, it, expect } from "vitest";
import {
  calculateNextPollInterval,
  INITIAL_POLL_INTERVAL_MS,
  MAX_POLL_INTERVAL_MS,
} from "./polling-backoff";

describe("polling-backoff logic", () => {
  it("trả về interval cơ bản khi mới bắt đầu hoặc có hoạt động mới", () => {
    expect(calculateNextPollInterval(0, true)).toBe(INITIAL_POLL_INTERVAL_MS);
    expect(calculateNextPollInterval(5, true)).toBe(INITIAL_POLL_INTERVAL_MS);
  });

  it("tăng dần interval theo cấp số nhân khi không có hoạt động mới", () => {
    // 0 lần rảnh -> 3s
    expect(calculateNextPollInterval(0, false)).toBe(3000);
    // 1 lần rảnh -> 3s
    expect(calculateNextPollInterval(1, false)).toBe(3000);
    // 2 lần rảnh -> 6s
    expect(calculateNextPollInterval(2, false)).toBe(6000);
    // 3 lần rảnh -> 12s (chạm max 12s)
    expect(calculateNextPollInterval(3, false)).toBe(12000);
    // >3 lần rảnh -> không vượt quá MAX_POLL_INTERVAL_MS (12s)
    expect(calculateNextPollInterval(10, false)).toBe(MAX_POLL_INTERVAL_MS);
  });
});
