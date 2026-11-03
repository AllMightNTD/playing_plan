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

import { BingBlockedError, type BingImageResult } from "./bing-image-search";
import { runRealPhotoSync, type RealPhotoSyncDeps } from "./real-photo-sync.runner";

const place = (n: number, name = "Cộng Cà Phê") => ({
  id: `p${n}`,
  slug: `slug-${n}`,
  name,
  area: "Hoàn Kiếm",
  category: "cafe" as const,
});

const candidates = (n: number): BingImageResult[] =>
  [1, 2, 3].map((i) => ({
    thumbnailUrl: `https://tse.example.com/${n}-${i}.jpg`,
    rank: i,
    imageUrl: `https://img.example.com/${n}-${i}.jpg`,
    pageUrl: `https://site${i}.example.com/page`,
    title: "Cộng Cà Phê Hà Nội",
    width: 1200,
    height: 800,
  }));

function makeDeps(over: Partial<RealPhotoSyncDeps> & { places?: ReturnType<typeof place>[] } = {}) {
  const { places = [place(1)], ...rest } = over;
  const deps = {
    listPlaces: vi.fn(async () => places),
    replaceImages: vi.fn(async () => undefined),
    search: vi.fn(async () => candidates(1)),
    verify: vi.fn(async () => ({ ok: true, width: 1200, height: 800 })),
    sleep: vi.fn(async () => undefined),
    random: () => 0.5,
    now: () => new Date("2026-11-03T00:00:00Z"),
    ...rest,
  } as unknown as RealPhotoSyncDeps;
  return deps;
}

describe("runRealPhotoSync", () => {
  beforeEach(() => {
    revalidate.mockClear();
    tracked.mockClear();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  it("found → replaceImages được gọi với rows và now", async () => {
    const deps = makeDeps();
    const s = await runRealPhotoSync({}, deps);
    expect(deps.replaceImages).toHaveBeenCalledTimes(1);
    const call = (deps.replaceImages as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toBe("p1");
    expect(call[1]).toHaveLength(3);
    expect(call[1][0]).toMatchObject({ platform: "bing", license: "unverified" });
    expect(call[2]).toEqual(new Date("2026-11-03T00:00:00Z"));
    expect(s.replaced).toBe(1);
    expect(s.photosInserted).toBe(3);
  });

  it("needs_review → không ghi DB, có trong summary.needsReview", async () => {
    const deps = makeDeps({ search: vi.fn(async () => []) });
    const s = await runRealPhotoSync({}, deps);
    expect(deps.replaceImages).not.toHaveBeenCalled();
    expect(s.needsReview).toHaveLength(1);
    expect(s.needsReview[0].slug).toBe("slug-1");
    expect(s.replaced).toBe(0);
  });

  it("dryRun → không gọi replaceImages nhưng vẫn đếm replaced", async () => {
    const deps = makeDeps();
    const s = await runRealPhotoSync({ dryRun: true }, deps);
    expect(deps.replaceImages).not.toHaveBeenCalled();
    expect(s.replaced).toBe(1);
    expect(s.photosInserted).toBe(3);
  });

  it("BingBlockedError ở place thứ 2 → dừng, blocked, processed === 1", async () => {
    const search = vi
      .fn()
      .mockResolvedValueOnce(candidates(1))
      .mockRejectedValueOnce(new BingBlockedError("captcha"));
    const deps = makeDeps({ places: [place(1), place(2), place(3)], search });
    const s = await runRealPhotoSync({}, deps);
    expect(s.blocked).toBe(true);
    expect(s.processed).toBe(1);
    expect(search).toHaveBeenCalledTimes(2);
  });

  it("throttle: ngủ giữa các place, không ngủ trước place đầu", async () => {
    const deps = makeDeps({ places: [place(1), place(2), place(3)] });
    await runRealPhotoSync({ delayMs: 2500 }, deps);
    expect(deps.sleep).toHaveBeenCalledTimes(2);
    expect(deps.sleep).toHaveBeenNthCalledWith(1, 3250);
    expect(deps.sleep).toHaveBeenNthCalledWith(2, 3250);
  });

  it("lỗi replaceImages ở 1 place không dừng run", async () => {
    const replaceImages = vi.fn().mockRejectedValueOnce(new Error("db down")).mockResolvedValue(undefined);
    const deps = makeDeps({ places: [place(1), place(2)], replaceImages });
    const s = await runRealPhotoSync({}, deps);
    expect(replaceImages).toHaveBeenCalledTimes(2);
    expect(s.needsReview).toHaveLength(1);
    expect(s.needsReview[0].slug).toBe("slug-1");
    expect(s.needsReview[0].rejected.db_error).toBe(1);
    expect(s.replaced).toBe(1);
    expect(s.processed).toBe(2);
  });

  it("blocked → runTrackedPipeline nhận status paused; chạy thường nhận success", async () => {
    const blocked = makeDeps({ search: vi.fn(async () => { throw new BingBlockedError("captcha"); }) });
    await runRealPhotoSync({}, blocked);
    expect(tracked).toHaveBeenLastCalledWith("real_photos", expect.objectContaining({ status: "paused" }));
    await runRealPhotoSync({}, makeDeps());
    expect(tracked).toHaveBeenLastCalledWith("real_photos", expect.objectContaining({ status: "success" }));
  });

  it("lỗi search thường → search_error kèm error, run vẫn tiếp tục", async () => {
    const search = vi.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValue(candidates(2));
    const s = await runRealPhotoSync({}, makeDeps({ places: [place(1), place(2)], search }));
    expect(s.blocked).toBe(false);
    expect(s.needsReview).toEqual([
      { slug: "slug-1", found: 0, rejected: { search_error: 1 }, error: "boom" },
    ]);
    expect(s.replaced).toBe(1);
    expect(s.processed).toBe(2);
  });

  it("revalidate gọi đúng 1 lần sau khi ghi thật, không gọi khi dryRun", async () => {
    await runRealPhotoSync({}, makeDeps({ places: [place(1), place(2)] }));
    expect(revalidate).toHaveBeenCalledTimes(1);
    revalidate.mockClear();
    await runRealPhotoSync({ dryRun: true }, makeDeps());
    expect(revalidate).not.toHaveBeenCalled();
  });
});
