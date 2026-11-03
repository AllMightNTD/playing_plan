import { beforeEach, describe, expect, it, vi } from "vitest";

const { revalidate, tracked } = vi.hoisted(() => ({
  revalidate: vi.fn(async () => undefined),
  tracked: vi.fn(),
}));

vi.mock("@/server/services/cache/revalidation", () => ({ revalidatePlaceCatalog: revalidate }));
vi.mock("@/server/services/pipeline/pipeline-run.service", () => ({
  runTrackedPipeline: async (
    runType: string,
    task: () => Promise<{ result: unknown; status?: string }>,
  ) => {
    const outcome = await task();
    tracked(runType, outcome);
    return outcome.result;
  },
}));

import type { ImageCheck } from "./image-url.verifier";
import { isDeadImage, recheckRealPhotos, type RecheckDeps } from "./real-photo-recheck.service";

const media = (id: string, placeId: string, sortOrder: number) => ({
  id,
  placeId,
  url: `https://img.example.com/${id}.jpg`,
  sortOrder,
  category: "cafe" as const,
});

const OK: ImageCheck = { ok: true, width: 1200, height: 800 } as ImageCheck;
const dead: ImageCheck = { ok: false, reason: "http_status", httpStatus: 404 };

function makeDeps(over: Partial<RecheckDeps> = {}) {
  return {
    listMedia: vi.fn(async () => []),
    verify: vi.fn(async () => OK),
    remove: vi.fn(async () => undefined),
    restore: vi.fn(async () => undefined),
    now: () => new Date("2026-11-03T00:00:00Z"),
    concurrency: 4,
    ...over,
  } as unknown as RecheckDeps;
}

describe("isDeadImage", () => {
  it.each([404, 403, 410])("http_status %i là chết", (httpStatus) => {
    expect(isDeadImage({ ok: false, reason: "http_status", httpStatus })).toBe(true);
  });
  it.each([408, 429, 500, 503])("http_status %i là lỗi tạm", (httpStatus) => {
    expect(isDeadImage({ ok: false, reason: "http_status", httpStatus })).toBe(false);
  });
  it("content_type và decode_failed là chết", () => {
    expect(isDeadImage({ ok: false, reason: "content_type" })).toBe(true);
    expect(isDeadImage({ ok: false, reason: "decode_failed" })).toBe(true);
  });
  it("network, too_small, bad_aspect, too_large, ok không phải chết", () => {
    expect(isDeadImage({ ok: false, reason: "network" })).toBe(false);
    expect(isDeadImage({ ok: false, reason: "too_small" })).toBe(false);
    expect(isDeadImage({ ok: false, reason: "bad_aspect" })).toBe(false);
    expect(isDeadImage({ ok: false, reason: "too_large" })).toBe(false);
    expect(isDeadImage(OK)).toBe(false);
  });
});

describe("recheckRealPhotos", () => {
  beforeEach(() => {
    revalidate.mockClear();
    tracked.mockClear();
  });

  it("một ảnh chết trong place 3 ảnh -> remove với cover là ảnh sống sortOrder nhỏ nhất", async () => {
    const deps = makeDeps({
      listMedia: vi.fn(async () => [media("a", "p1", 0), media("b", "p1", 1), media("c", "p1", 2)]),
      verify: vi.fn(async (url: string) => (url.includes("/a.") ? dead : OK)),
    });
    const s = await recheckRealPhotos(deps);
    expect(deps.remove).toHaveBeenCalledWith("p1", ["a"], "https://img.example.com/b.jpg", new Date("2026-11-03T00:00:00Z"));
    expect(deps.restore).not.toHaveBeenCalled();
    expect(s).toEqual({ checked: 3, dead: 1, placesTouched: 1, placesRestoredToStock: 0 });
    expect(revalidate).toHaveBeenCalledTimes(1);
    expect(tracked).toHaveBeenCalledWith("real_photos", expect.objectContaining({ status: "success" }));
  });

  it("mọi ảnh chết -> restore, không remove", async () => {
    const deps = makeDeps({
      listMedia: vi.fn(async () => [media("a", "p1", 0), media("b", "p1", 1)]),
      verify: vi.fn(async () => dead),
    });
    const s = await recheckRealPhotos(deps);
    expect(deps.restore).toHaveBeenCalledWith("p1", "cafe", ["a", "b"], expect.any(Date));
    expect(deps.remove).not.toHaveBeenCalled();
    expect(s.placesRestoredToStock).toBe(1);
    expect(s.placesTouched).toBe(1);
  });

  it("chỉ lỗi network -> không đụng DB, không revalidate", async () => {
    const deps = makeDeps({
      listMedia: vi.fn(async () => [media("a", "p1", 0)]),
      verify: vi.fn(async () => ({ ok: false, reason: "network" }) as ImageCheck),
    });
    const s = await recheckRealPhotos(deps);
    expect(deps.remove).not.toHaveBeenCalled();
    expect(deps.restore).not.toHaveBeenCalled();
    expect(s.dead).toBe(0);
    expect(revalidate).not.toHaveBeenCalled();
  });

  it("không quá concurrency verify chạy đồng thời", async () => {
    let running = 0;
    let peak = 0;
    const deps = makeDeps({
      listMedia: vi.fn(async () =>
        Array.from({ length: 10 }, (_, i) => media(`m${i}`, `p${i}`, 0)),
      ),
      verify: vi.fn(async () => {
        running++;
        peak = Math.max(peak, running);
        await new Promise((r) => setTimeout(r, 5));
        running--;
        return OK;
      }),
      concurrency: 4,
    });
    const s = await recheckRealPhotos(deps);
    expect(s.checked).toBe(10);
    expect(peak).toBeGreaterThan(1);
    expect(peak).toBeLessThanOrEqual(4);
  });
});
