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
import {
  resolveRealPhotosDailyLimit,
  runRealPhotoSync,
  type RealPhotoSyncDeps,
} from "./real-photo-sync.runner";

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

// Mỗi lần search trả bộ URL khác nhau để loại trừ URL đã dùng không ảnh hưởng
function distinctSearch() {
  let n = 0;
  return vi.fn(async () => candidates(++n));
}

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

  it("dryRun: place found nằm trong summary.found kèm ảnh; tracked promotedCount 0, dryRun true", async () => {
    const s = await runRealPhotoSync({ dryRun: true }, makeDeps());
    expect(s.found).toHaveLength(1);
    expect(s.found[0]).toMatchObject({ slug: "slug-1", query: "Cộng Cà Phê Hoàn Kiếm Hà Nội" });
    expect(s.found[0].photos).toHaveLength(3);
    expect(s.found[0].photos[0]).toEqual({
      imageUrl: "https://img.example.com/1-1.jpg",
      pageUrl: "https://site1.example.com/page",
      title: "Cộng Cà Phê Hà Nội",
    });
    expect(tracked).toHaveBeenLastCalledWith(
      "real_photos",
      expect.objectContaining({ promotedCount: 0, summary: expect.objectContaining({ dryRun: true }) }),
    );
  });

  it("needsReview kèm query và candidatesSeen", async () => {
    const lowScore = candidates(1).map((x) => ({ ...x, title: "ảnh linh tinh" }));
    const s = await runRealPhotoSync({}, makeDeps({ search: vi.fn(async () => lowScore) }));
    expect(s.needsReview[0]).toMatchObject({
      slug: "slug-1",
      query: "Cộng Cà Phê Hoàn Kiếm Hà Nội",
      candidatesSeen: 3,
    });
  });

  it("không dùng lại URL ảnh đã gán cho place trước trong cùng run", async () => {
    const pool = [...candidates(1), ...candidates(2)];
    const deps = makeDeps({ places: [place(1), place(2)], search: vi.fn(async () => pool) });
    await runRealPhotoSync({}, deps);
    const calls = (deps.replaceImages as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls).toHaveLength(2);
    const first = new Set(calls[0][1].map((r: { url: string }) => r.url));
    const second: string[] = calls[1][1].map((r: { url: string }) => r.url);
    expect(second.length).toBeGreaterThan(0);
    expect(second.some((u) => first.has(u))).toBe(false);
  });

  it("3 lần replaceImages lỗi liên tiếp → dừng run, aborted db_errors, status paused", async () => {
    const replaceImages = vi.fn(async () => {
      throw new Error("db down");
    });
    const places = [1, 2, 3, 4, 5].map((n) => place(n));
    const s = await runRealPhotoSync(
      {},
      makeDeps({ places, replaceImages, search: distinctSearch() }),
    );
    expect(replaceImages).toHaveBeenCalledTimes(3);
    expect(s.aborted).toBe(true);
    expect(s.abortReason).toBe("db_errors");
    expect(s.processed).toBe(3);
    expect(tracked).toHaveBeenLastCalledWith("real_photos", expect.objectContaining({ status: "paused" }));
  });

  it("lỗi DB xen kẽ thành công không làm dừng run", async () => {
    const replaceImages = vi
      .fn()
      .mockRejectedValueOnce(new Error("x"))
      .mockRejectedValueOnce(new Error("x"))
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("x"))
      .mockRejectedValueOnce(new Error("x"));
    const places = [1, 2, 3, 4, 5].map((n) => place(n));
    const s = await runRealPhotoSync({}, makeDeps({ places, replaceImages, search: distinctSearch() }));
    expect(replaceImages).toHaveBeenCalledTimes(5);
    expect(s.aborted).toBe(false);
    expect(s.processed).toBe(5);
  });
});

describe("resolveRealPhotosDailyLimit", () => {
  it.each([
    [undefined, 0],
    ["", 0],
    ["  ", 0],
    ["abc", 0],
    ["-5", 0],
    ["0", 0],
    ["15", 15],
    [" 7 ", 7],
  ])("%j → %i", (raw, expected) => {
    expect(resolveRealPhotosDailyLimit(raw)).toBe(expected);
  });
});
