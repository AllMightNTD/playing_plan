import { describe, expect, it, afterEach } from "vitest";
import {
  assertFieldProvenanceAllowed,
  assertNotBlocklisted,
  isCandidateBlocklisted,
  resolveFieldPrecedence,
  filterAiSummary,
  assertPublishNotHalted,
} from "./governance.policy";
import type { PlaceBlocklist } from "@/server/db/schema";
import { AppError } from "@/server/http/errors";

describe("governance.policy", () => {
  describe("assertFieldProvenanceAllowed (Chống AI ảo giác)", () => {
    it("ném lỗi khi nguồn AI cố tình ghi vào opening_hours hoặc est_cost", () => {
      expect(() => assertFieldProvenanceAllowed("ai", "opening_hours")).toThrowError(AppError);
      expect(() => assertFieldProvenanceAllowed("ai", "openingHours")).toThrowError(AppError);
      expect(() => assertFieldProvenanceAllowed("ai", "est_cost")).toThrowError(AppError);
      expect(() => assertFieldProvenanceAllowed("ai", "photo_spots")).toThrowError(AppError);
      expect(() => assertFieldProvenanceAllowed("ai", "poses")).toThrowError(AppError);
    });

    it("cho phép nguồn AI ghi vào các trường mô tả chung", () => {
      expect(() => assertFieldProvenanceAllowed("ai", "summary")).not.toThrow();
      expect(() => assertFieldProvenanceAllowed("ai", "outfit_general_tip")).not.toThrow();
    });

    it("cho phép nguồn Editor hoặc Merchant ghi vào bất kỳ trường nào", () => {
      expect(() => assertFieldProvenanceAllowed("editor", "opening_hours")).not.toThrow();
      expect(() => assertFieldProvenanceAllowed("merchant", "est_cost")).not.toThrow();
    });
  });

  describe("resolveFieldPrecedence (Thứ bậc ưu tiên nguồn)", () => {
    it("nguồn Editor (1.0) có thể ghi đè mọi nguồn thấp hơn", () => {
      expect(resolveFieldPrecedence("ai", "editor")).toBe(true);
      expect(resolveFieldPrecedence("osm", "editor")).toBe(true);
      expect(resolveFieldPrecedence("user", "editor")).toBe(true);
    });

    it("nguồn AI (0.4) không được phép ghi đè các nguồn cao hơn", () => {
      expect(resolveFieldPrecedence("editor", "ai")).toBe(false);
      expect(resolveFieldPrecedence("osm", "ai")).toBe(false);
      expect(resolveFieldPrecedence("user", "ai")).toBe(false);
    });

    it("hai nguồn cùng cấp được phép cập nhật", () => {
      expect(resolveFieldPrecedence("editor", "editor")).toBe(true);
      expect(resolveFieldPrecedence("ai", "ai")).toBe(true);
    });
  });

  describe("assertNotBlocklisted & isCandidateBlocklisted", () => {
    const sampleBlocklist: PlaceBlocklist[] = [
      {
        id: "b1",
        osmId: "osm-999",
        namePattern: "(đường|ray|pho|ca fe|cafe|coffee).*(tau|tàu|railway|train)",
        latMin: "21.025000",
        latMax: "21.035000",
        lngMin: "105.840000",
        lngMax: "105.850000",
        reason: "railway_safety",
        note: "Khu vực cà phê đường tàu nguy hiểm",
        createdAt: new Date(),
      },
    ];

    it("chặn địa điểm có tên khớp regex cấm", () => {
      expect(
        isCandidateBlocklisted(
          { name: "Cafe Đường Tàu Phùng Hưng", lat: 21.000, lng: 105.800 },
          sampleBlocklist
        )
      ).toBe(true);

      expect(() =>
        assertNotBlocklisted(
          { name: "Coffee Train Street Hanoi", lat: 21.000, lng: 105.800 },
          sampleBlocklist
        )
      ).toThrowError(AppError);
    });

    it("chặn địa điểm nằm trong bounding box nguy hiểm", () => {
      expect(
        isCandidateBlocklisted(
          { name: "Quán Nước Bí Mật", lat: 21.030, lng: 105.845 },
          sampleBlocklist
        )
      ).toBe(true);
    });

    it("chặn địa điểm trùng osmId cấm", () => {
      expect(
        isCandidateBlocklisted(
          { name: "Quán An Toàn", osmId: "osm-999", lat: 21.000, lng: 105.800 },
          sampleBlocklist
        )
      ).toBe(true);
    });

    it("cho phép địa điểm hợp lệ không vi phạm", () => {
      expect(
        isCandidateBlocklisted(
          { name: "Cà phê Giảng Yên Phụ", osmId: "osm-123", lat: 21.050, lng: 105.830 },
          sampleBlocklist
        )
      ).toBe(false);

      expect(() =>
        assertNotBlocklisted(
          { name: "Hồ Hoàn Kiếm", osmId: "osm-456", lat: 21.028, lng: 105.854 },
          sampleBlocklist
        )
      ).not.toThrow();
    });
  });

  describe("filterAiSummary", () => {
    it("giữ nguyên summary nếu nguồn là editor hoặc user", () => {
      expect(
        filterAiSummary({ source: "editor", confidence: 1.0 }, "Mô tả chuẩn")
      ).toBe("Mô tả chuẩn");
      expect(
        filterAiSummary({ source: "user", confidence: 0.8 }, "Mô tả đóng góp")
      ).toBe("Mô tả đóng góp");
    });

    it("giữ summary từ AI nếu confidence >= 0.60 hoặc đã verified", () => {
      expect(
        filterAiSummary({ source: "ai", confidence: "0.75", verified: false }, "Mô tả chất lượng")
      ).toBe("Mô tả chất lượng");
      expect(
        filterAiSummary({ source: "ai", confidence: "0.40", verified: true }, "Đã kiểm duyệt")
      ).toBe("Đã kiểm duyệt");
    });

    it("ẩn summary từ AI (trả về null) nếu confidence < 0.60 và chưa verified", () => {
      expect(
        filterAiSummary({ source: "ai", confidence: "0.40", verified: false }, "Mô tả ảo giác")
      ).toBeNull();
    });
  });

  describe("assertPublishNotHalted (Emergency Kill Switch)", () => {
    const originalEnv = process.env.EMERGENCY_HALT_PUBLISH;

    afterEach(() => {
      process.env.EMERGENCY_HALT_PUBLISH = originalEnv;
    });

    it("không ném lỗi khi cờ EMERGENCY_HALT_PUBLISH không bật", () => {
      delete process.env.EMERGENCY_HALT_PUBLISH;
      expect(() => assertPublishNotHalted()).not.toThrow();
    });

    it("ném lỗi ngắt xuất bản khi EMERGENCY_HALT_PUBLISH = 'true'", () => {
      process.env.EMERGENCY_HALT_PUBLISH = "true";
      expect(() => assertPublishNotHalted()).toThrowError(AppError);
    });
  });
});
