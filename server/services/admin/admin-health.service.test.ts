import { describe, expect, it, vi } from "vitest";
import { evaluateAdminHealth, type HealthInputs } from "./admin-health.service";

vi.mock("@/server/db/client", () => ({ isDatabaseConfigured: vi.fn() }));
vi.mock("@/server/db/queries/admin/health.queries", () => ({}));
vi.mock("@/server/services/pipeline/pipeline-control.service", () => ({}));
vi.mock("@/server/services/youtube/quota-ledger", () => ({}));

const NOW = new Date("2026-10-29T10:00:00.000Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3600000);

const HEALTHY: HealthInputs = {
  databaseConfigured: true,
  dbLatencyMs: 120,
  dbError: null,
  latestRun: { runType: "auto_promote", status: "success", startedAt: hoursAgo(5), finishedAt: hoursAgo(4) },
  pause: { isPaused: false, source: null, reason: null },
  youtubeHalted: false,
};

describe("evaluateAdminHealth", () => {
  it("ok khi DB nhanh, pipeline chạy gần đây, không phanh", () => {
    expect(evaluateAdminHealth(HEALTHY, NOW).level).toBe("ok");
  });

  it("down khi chưa cấu hình hoặc không kết nối được DB", () => {
    expect(evaluateAdminHealth({ ...HEALTHY, databaseConfigured: false }, NOW).level).toBe("down");
    expect(evaluateAdminHealth({ ...HEALTHY, dbError: "timeout" }, NOW).level).toBe("down");
  });

  it("degraded khi pipeline lỗi, treo, quá lâu không chạy hoặc chưa chạy", () => {
    const failed = { ...HEALTHY.latestRun!, status: "failed" };
    const stuck = { ...HEALTHY.latestRun!, status: "running", startedAt: hoursAgo(4), finishedAt: null };
    const stale = { ...HEALTHY.latestRun!, startedAt: hoursAgo(40) };
    for (const latestRun of [failed, stuck, stale, null]) {
      expect(evaluateAdminHealth({ ...HEALTHY, latestRun }, NOW).level).toBe("degraded");
    }
  });

  it("degraded và nêu lý do khi phanh publish bật hoặc hết quota YouTube", () => {
    const paused = evaluateAdminHealth({ ...HEALTHY, pause: { isPaused: true, source: "breaker", reason: "acc 70%" } }, NOW);
    expect(paused.level).toBe("degraded");
    expect(paused.checks.find((c) => c.key === "publish")?.message).toContain("acc 70%");
    expect(evaluateAdminHealth({ ...HEALTHY, youtubeHalted: true }, NOW).level).toBe("degraded");
  });
});
