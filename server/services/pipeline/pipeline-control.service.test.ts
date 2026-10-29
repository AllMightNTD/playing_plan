import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPublishPauseState, SYSTEM_ACTOR } from "./pipeline-control.service";
import { isDatabaseConfigured } from "@/server/db/client";
import { findPipelineControl } from "@/server/db/queries/admin/pipeline-control.queries";

vi.mock("@/server/db/client", () => ({ isDatabaseConfigured: vi.fn() }));
vi.mock("@/server/db/queries/admin/pipeline-control.queries", () => ({
  findPipelineControl: vi.fn(),
  upsertPipelineControl: vi.fn(),
}));

const AT = new Date("2026-10-29T03:00:00.000Z");

describe("getPublishPauseState", () => {
  const originalHalt = process.env.EMERGENCY_HALT_PUBLISH;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.EMERGENCY_HALT_PUBLISH;
    vi.mocked(isDatabaseConfigured).mockReturnValue(true);
  });

  afterEach(() => {
    if (originalHalt === undefined) delete process.env.EMERGENCY_HALT_PUBLISH;
    else process.env.EMERGENCY_HALT_PUBLISH = originalHalt;
  });

  it("env EMERGENCY_HALT_PUBLISH thắng mọi cờ trong DB", async () => {
    process.env.EMERGENCY_HALT_PUBLISH = "true";
    expect((await getPublishPauseState()).source).toBe("env");
    expect(findPipelineControl).not.toHaveBeenCalled();
  });

  it("phân biệt phanh do circuit breaker và do admin", async () => {
    vi.mocked(findPipelineControl).mockResolvedValue({
      key: "publish_paused", isEnabled: true, reason: "acc thấp", updatedBy: SYSTEM_ACTOR, updatedAt: AT,
    });
    expect(await getPublishPauseState()).toMatchObject({ isPaused: true, source: "breaker" });

    vi.mocked(findPipelineControl).mockResolvedValue({
      key: "publish_paused", isEnabled: true, reason: "bảo trì", updatedBy: "admin@x.vn", updatedAt: AT,
    });
    expect(await getPublishPauseState()).toMatchObject({ isPaused: true, source: "admin" });
  });

  it("chưa có DB hoặc cờ tắt thì không phanh", async () => {
    vi.mocked(findPipelineControl).mockResolvedValue(null);
    expect((await getPublishPauseState()).isPaused).toBe(false);

    vi.mocked(isDatabaseConfigured).mockReturnValue(false);
    expect((await getPublishPauseState()).isPaused).toBe(false);
  });
});
