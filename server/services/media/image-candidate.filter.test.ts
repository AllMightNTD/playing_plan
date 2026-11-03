import { describe, expect, it } from "vitest";
import type { BingImageResult } from "./bing-image-search";
import { normalizeVi, rankImageCandidates, scoreImageCandidate } from "./image-candidate.filter";

function c(overrides: Partial<BingImageResult> = {}): BingImageResult {
  return {
    imageUrl: "https://x.vn/a.jpg",
    thumbnailUrl: null,
    pageUrl: "https://x.vn/p",
    title: "",
    rank: 0,
    ...overrides,
  };
}

describe("image-candidate.filter", () => {
  it("normalizeVi bỏ dấu, đ→d, gộp ký tự lạ", () =>
    expect(normalizeVi("  Cộng Cà-Phê ĐỒNG Xuân!! ")).toBe("cong ca phe dong xuan"));

  it("match tên có dấu với title không dấu viết liền", () => {
    const r = scoreImageCandidate(c({ title: "Cong Caphe Hanoi - quán đẹp" }), { name: "Cộng Cà Phê" });
    expect(r.rejectReason).toBeNull();
    expect(r.score).toBe(3);
  });

  it("tên toàn từ chung thì fallback dùng mọi token", () => {
    const r = scoreImageCandidate(c({ title: "Cafe Nhà Hà Nội" }), { name: "Cafe Nhà" });
    expect(r.score).toBe(3);
  });

  it("trừ điểm chi nhánh thành phố khác", () => {
    const r = scoreImageCandidate(c({ title: "Cộng Cà Phê Sài Gòn quận 1" }), { name: "Cộng Cà Phê" });
    expect(r.score).toBe(-1);
  });

  it("loại host fbcdn", () =>
    expect(
      scoreImageCandidate(c({ imageUrl: "https://scontent.xx.fbcdn.net/v/a.jpg" }), { name: "X" }).rejectReason,
    ).toBe("blocked_host"));

  it("loại svg/gif", () =>
    expect(scoreImageCandidate(c({ imageUrl: "https://x.vn/logo.svg" }), { name: "X" }).rejectReason).toBe(
      "bad_extension",
    ));

  it("loại keyword menu/bảng giá theo token, không match substring", () => {
    expect(
      scoreImageCandidate(c({ title: "Bảng giá Cộng Cà Phê" }), { name: "Cộng Cà Phê" }).rejectReason,
    ).toBe("reject_keyword");
    expect(scoreImageCandidate(c({ title: "Mapple Cafe Hà Nội" }), { name: "Mapple" }).rejectReason).toBeNull();
  });

  it("cộng điểm domain tin cậy", () =>
    expect(
      scoreImageCandidate(c({ title: "Cộng Cà Phê", pageUrl: "https://www.foody.vn/ha-noi/cong" }), {
        name: "Cộng Cà Phê",
      }).score,
    ).toBe(4));

  it("không throw khi pageUrl null hoặc URL hỏng", () => {
    expect(() => scoreImageCandidate(c({ pageUrl: null }), { name: "X" })).not.toThrow();
    expect(() => scoreImageCandidate(c({ pageUrl: "::bad", imageUrl: "nope" }), { name: "X" })).not.toThrow();
  });

  it("rank: lọc score<2, sort score giảm rồi rank tăng", () => {
    const out = rankImageCandidates(
      [
        c({ rank: 0, title: "ảnh linh tinh" }),
        c({ rank: 1, title: "Cộng Cà Phê" }),
        c({ rank: 2, title: "Cộng Cà Phê Hà Nội" }),
        c({ rank: 3, title: "Cộng Cà Phê Hanoi" }),
      ],
      { name: "Cộng Cà Phê" },
    );
    expect(out.map((x) => x.rank)).toEqual([2, 3, 1]);
  });
});
