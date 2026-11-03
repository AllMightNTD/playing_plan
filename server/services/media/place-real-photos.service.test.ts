import { describe, expect, it, vi } from "vitest";
import { BingBlockedError, type BingImageResult } from "./bing-image-search";
import type { ImageCheck } from "./image-url.verifier";
import {
  REAL_PHOTO_LICENSE_NOTE,
  buildRealPhotoMediaRows,
  findRealPhotosForPlace,
  type RealPhoto,
} from "./place-real-photos.service";

const place = { id: "plc_1", name: "Cộng Cà Phê", area: "Hà Nội" };

function makeResults(n: number): BingImageResult[] {
  return Array.from({ length: n }, (_, i) => ({
    imageUrl: `https://cdn.example.vn/img${i}.jpg`,
    thumbnailUrl: null,
    pageUrl: `https://example.vn/p${i}`,
    title: "Cộng Cà Phê Hà Nội",
    rank: i,
  }));
}

const okCheck: ImageCheck = { ok: true, width: 1200, height: 800, bytes: 1000, contentType: "image/jpeg" };

describe("findRealPhotosForPlace", () => {
  it("dừng verify khi đủ 4 ảnh", async () => {
    const search = vi.fn().mockResolvedValue(makeResults(8));
    const verify = vi.fn().mockResolvedValue(okCheck);
    const out = await findRealPhotosForPlace(place, { search, verify });
    expect(out.photos).toHaveLength(4);
    expect(verify).toHaveBeenCalledTimes(4);
    expect(out.status).toBe("found");
    expect(out.candidatesSeen).toBe(8);
  });

  it("không verify quá 10 lần", async () => {
    const search = vi.fn().mockResolvedValue(makeResults(15));
    const verify = vi.fn().mockResolvedValue({ ok: false, reason: "too_small" } satisfies ImageCheck);
    const out = await findRealPhotosForPlace(place, { search, verify });
    expect(verify).toHaveBeenCalledTimes(10);
    expect(out.status).toBe("needs_review");
    expect(out.rejected.too_small).toBe(10);
  });

  it("1 ảnh ok -> needs_review nhưng vẫn trả photo", async () => {
    const search = vi.fn().mockResolvedValue(makeResults(5));
    const verify = vi
      .fn()
      .mockResolvedValueOnce(okCheck)
      .mockResolvedValue({ ok: false, reason: "network" } satisfies ImageCheck);
    const out = await findRealPhotosForPlace(place, { search, verify });
    expect(out.photos).toHaveLength(1);
    expect(out.status).toBe("needs_review");
  });

  it("bỏ qua excludeUrls", async () => {
    const results = makeResults(3);
    const search = vi.fn().mockResolvedValue(results);
    const verify = vi.fn().mockResolvedValue(okCheck);
    await findRealPhotosForPlace(place, { search, verify, excludeUrls: new Set([results[0].imageUrl]) });
    const called = verify.mock.calls.map((c) => c[0]);
    expect(called).not.toContain(results[0].imageUrl);
    expect(called).toHaveLength(2);
  });

  it("BingBlockedError từ search được ném tiếp", async () => {
    const search = vi.fn().mockRejectedValue(new BingBlockedError("captcha"));
    const verify = vi.fn();
    await expect(findRealPhotosForPlace(place, { search, verify })).rejects.toBeInstanceOf(BingBlockedError);
  });
});

describe("buildRealPhotoMediaRows", () => {
  it("map photo sang row place_media", () => {
    const photos: RealPhoto[] = [
      { imageUrl: "https://cdn.abc.vn/y.jpg", pageUrl: "https://www.foody.vn/x", title: "a", width: 1000, height: 600 },
      { imageUrl: "https://cdn.abc.vn/y.jpg", pageUrl: null, title: "b", width: 1000, height: 600 },
    ];
    const rows = buildRealPhotoMediaRows({ id: "plc_1", name: "N".repeat(250) }, photos);
    expect(rows[0]).toMatchObject({
      placeId: "plc_1",
      platform: "bing",
      type: "image",
      license: "unverified",
      licenseNote: REAL_PHOTO_LICENSE_NOTE,
      credit: "foody.vn",
      sourceUrl: "https://www.foody.vn/x",
      sortOrder: 0,
      embedId: null,
    });
    expect(rows[1]).toMatchObject({ credit: "cdn.abc.vn", sourceUrl: "https://cdn.abc.vn/y.jpg", sortOrder: 1 });
    expect(rows[0].id).toMatch(/^med_[\w-]{16}$/);
    expect(rows[0].caption).toHaveLength(200);
  });
});
