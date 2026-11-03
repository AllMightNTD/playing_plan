import { describe, expect, it } from "vitest";
import {
  cleanAddressText,
  buildGoogleMapsSearchQuery,
  buildGoogleMapsSearchUrl,
  buildGoogleMapsDirectionsUrl,
  buildGoogleMapsEmbedUrl,
} from "./google-maps.builder";

describe("google-maps.builder", () => {
  describe("cleanAddressText", () => {
    it("giữ nguyên địa chỉ hợp lệ và thêm hậu tố Hà Nội nếu thiếu", () => {
      expect(cleanAddressText("272 Võ Chí Công, Phú Thượng", "Tây Hồ")).toBe(
        "272 Võ Chí Công, Phú Thượng, Hà Nội"
      );
      expect(cleanAddressText("Phố 19 Tháng 12, Hoàn Kiếm, Hà Nội", "Hoàn Kiếm")).toBe(
        "Phố 19 Tháng 12, Hoàn Kiếm, Hà Nội"
      );
    });

    it("loại bỏ placeholder dạng 'Hà Nội (tay_ho)' và fallback về area", () => {
      expect(cleanAddressText("Hà Nội (tay_ho)", "Tây Hồ")).toBe("Tây Hồ, Hà Nội");
      expect(cleanAddressText("Hà Nội (hoan_kiem)", "Hoàn Kiếm")).toBe("Hoàn Kiếm, Hà Nội");
    });

    it("loại bỏ địa chỉ chỉ có tên quận generic kiểu 'Ba Đình, Hà Nội' và fallback về area", () => {
      expect(cleanAddressText("Ba Đình, Hà Nội", "Ba Đình")).toBe("Ba Đình, Hà Nội");
    });

    it("xử lý an toàn khi address là null hoặc undefined", () => {
      expect(cleanAddressText(null, "Đống Đa")).toBe("Đống Đa, Hà Nội");
      expect(cleanAddressText(undefined, undefined)).toBe("Hà Nội");
    });
  });

  describe("buildGoogleMapsSearchQuery", () => {
    it("kết hợp tên địa điểm và địa chỉ chi tiết", () => {
      const query = buildGoogleMapsSearchQuery({
        name: "Thủy Cung Lotte World Aquarium",
        address: "272 Võ Chí Công, Tây Hồ, Hà Nội",
        area: "Tây Hồ",
      });
      expect(query).toBe("Thủy Cung Lotte World Aquarium, 272 Võ Chí Công, Tây Hồ, Hà Nội");
    });

    it("không lặp lại nếu tên quán đã chứa địa chỉ", () => {
      const query = buildGoogleMapsSearchQuery({
        name: "Hồ Hoàn Kiếm, Hà Nội",
        address: "Hà Nội",
      });
      expect(query).toBe("Hồ Hoàn Kiếm, Hà Nội");
    });
  });

  describe("buildGoogleMapsSearchUrl", () => {
    it("ưu tiên link googleMapsUrl có sẵn", () => {
      const url = buildGoogleMapsSearchUrl({
        name: "Sen Tây Hồ",
        googleMapsUrl: "https://maps.app.goo.gl/custom123",
      });
      expect(url).toBe("https://maps.app.goo.gl/custom123");
    });

    it("kèm theo query_place_id nếu có placeId", () => {
      const url = buildGoogleMapsSearchUrl({
        name: "Sen Tây Hồ",
        placeId: "ChIJ123456789",
      });
      expect(url).toContain("https://www.google.com/maps/search/?api=1");
      expect(url).toContain("query_place_id=ChIJ123456789");
      expect(url).toContain("query=Sen%20T%C3%A2y%20H%E1%BB%93");
    });

    it("tạo search URL chuẩn kích hoạt POI khi không có placeId", () => {
      const url = buildGoogleMapsSearchUrl({
        name: "COMPLEX 01",
        address: "29 Ngõ 167 Tây Sơn",
        area: "Đống Đa",
      });
      expect(url).toContain("https://www.google.com/maps/search/?api=1&query=");
      expect(url).toContain("COMPLEX%2001");
      expect(url).toContain("T%C3%A2y%20S%C6%A1n");
      // Tuyệt đối không sinh ra dạngDropped Pin tọa độ số thô `query=21.0,105.0`
      expect(url).not.toMatch(/query=\d+\.\d+,\d+\.\d+/);
    });
  });

  describe("buildGoogleMapsDirectionsUrl", () => {
    it("tạo link dẫn đường chuẩn với destination", () => {
      const url = buildGoogleMapsDirectionsUrl({
        name: "Cầu Long Biên",
        address: "Cầu Long Biên, Hoàn Kiếm, Hà Nội",
      });
      expect(url).toContain("https://www.google.com/maps/dir/?api=1&destination=");
      expect(url).toContain("C%E1%BA%A7u%20Long%20Bi%C3%AAn");
    });

    it("kèm theo destination_place_id nếu có", () => {
      const url = buildGoogleMapsDirectionsUrl({
        name: "Cầu Long Biên",
        placeId: "ChIJLongBien",
      });
      expect(url).toContain("&destination_place_id=ChIJLongBien");
    });
  });

  describe("buildGoogleMapsEmbedUrl", () => {
    it("tạo link iframe embed hiển thị tên địa điểm chuẩn", () => {
      const url = buildGoogleMapsEmbedUrl({
        name: "Bảo Tàng Mỹ Thuật Việt Nam",
        address: "66 Nguyễn Thái Học, Ba Đình, Hà Nội",
      });
      expect(url).toContain("https://maps.google.com/maps?q=");
      expect(url).toContain("output=embed");
      expect(url).toContain("B%E1%BA%A3o%20T%C3%A0ng%20M%E1%BB%B9%20Thu%E1%BA%ADt");
    });
  });
});
