import { describe, expect, it } from "vitest";
import { isGenericAddress, enrichPlaceMapInfo } from "./geocoding.service";

describe("geocoding.service", () => {
  describe("isGenericAddress", () => {
    it("nhận diện đúng các địa chỉ generic placeholder", () => {
      expect(isGenericAddress("Hà Nội (tay_ho)")).toBe(true);
      expect(isGenericAddress("Hà Nội (ba_dinh)")).toBe(true);
      expect(isGenericAddress("Hà Nội (hoan_kiem)")).toBe(true);
      expect(isGenericAddress("Hoàn Kiếm, Hà Nội")).toBe(true);
      expect(isGenericAddress("Ba Đình, Hà Nội")).toBe(true);
      expect(isGenericAddress("Tây Hồ, Hà Nội")).toBe(true);
      expect(isGenericAddress("")).toBe(true);
      expect(isGenericAddress(null)).toBe(true);
      expect(isGenericAddress(undefined)).toBe(true);
      expect(isGenericAddress("Hà Nội")).toBe(true);
    });

    it("nhận diện đúng địa chỉ chi tiết cụ thể", () => {
      expect(isGenericAddress("272 Võ Chí Công, Phú Thượng, Tây Hồ, Hà Nội")).toBe(false);
      expect(isGenericAddress("Số 1 Tràng Tiền, Hoàn Kiếm, Hà Nội")).toBe(false);
      expect(isGenericAddress("29 Ngõ 167 Tây Sơn, Đống Đa, Hà Nội")).toBe(false);
    });
  });

  describe("enrichPlaceMapInfo", () => {
    it("giữ nguyên địa chỉ xịn và sinh ra Google Maps URL chuẩn", async () => {
      const place = {
        id: "p11",
        name: "Thủy Cung Lotte World Aquarium",
        address: "Tầng B1, Lotte Mall West Lake, 272 Võ Chí Công, Phú Thượng, Tây Hồ, Hà Nội",
        area: "Tây Hồ",
        lat: 21.0745,
        lng: 105.8118,
      };

      const result = await enrichPlaceMapInfo(place);
      expect(result.address).toBe(place.address);
      expect(result.googleMapsUrl).toContain("https://www.google.com/maps/search/?api=1&query=");
      expect(result.googleMapsUrl).toContain("Th%E1%BB%A7y%20Cung%20Lotte");
    });
  });
});
