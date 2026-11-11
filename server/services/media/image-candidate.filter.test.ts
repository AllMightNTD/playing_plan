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

  it("không match chéo dấu: 'cổng'/'Công' không phải 'Cộng'", () => {
    const place = { name: "Cộng Cà Phê" };
    const cand = c({ title: "Công viên Thống Nhất Hà Nội cổng" });
    expect(scoreImageCandidate(cand, place).score).toBeLessThan(2);
    expect(rankImageCandidates([cand], place)).toEqual([]);
  });

  it("title có dấu khớp đúng dấu vẫn match", () => {
    expect(scoreImageCandidate(c({ title: "Cộng Cà Phê Hà Nội" }), { name: "Cộng Cà Phê" }).score).toBe(3);
  });

  it("dấu thanh đặt kiểu cũ/mới (hoà/hòa) vẫn coi là cùng dấu", () => {
    expect(scoreImageCandidate(c({ title: "Hoà Bình Hà Nội" }), { name: "Hòa Bình" }).score).toBe(3);
  });

  it("tên chứa thành phố khác thì không bị trừ điểm thành phố đó", () => {
    const r = scoreImageCandidate(c({ title: "Cafe Sài Gòn Xưa Hà Nội" }), { name: "Cafe Sài Gòn Xưa" });
    expect(r.score).toBeGreaterThanOrEqual(2);
    expect(r.score).toBe(3);
  });

  it("chặn tài liệu y tế / acronym khi tên ngắn không có ngữ cảnh ẩm thực (case AHA CPR)", () => {
    const res = scoreImageCandidate(
      c({
        title: "2025 AHA Guidelines for CPR and ECC",
        pageUrl: "https://shopcpr.heart.org/aha-guidelines",
        imageUrl: "https://shopcpr.heart.org/guidelines.png",
      }),
      { name: "Aha Coffee" },
    );
    expect(res.rejectReason).toBe("missing_food_context");
    expect(res.score).toBe(0);
  });

  it("chấp thuận Aha Cafe trên Foody với điểm cao nhờ ngữ cảnh ẩm thực và Shopee/Foody CDN", () => {
    const res = scoreImageCandidate(
      c({
        title: "Aha Cafe - Tô Hiệu ở Quận Cầu Giấy, Hà Nội | Foody.vn",
        pageUrl: "https://www.foody.vn/ha-noi/aha-cafe-to-hieu",
        imageUrl: "https://down-vn.img.susercontent.com/vn-11134259-7r98o-lwgsjp3y7krd95@resize_w800",
      }),
      { name: "Aha Coffee" },
    );
    expect(res.rejectReason).toBeNull();
    // 2 (coverage) + 1 (ha noi) + 1 (foody.vn) + 2 (susercontent CDN) = 6
    expect(res.score).toBe(6);
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
