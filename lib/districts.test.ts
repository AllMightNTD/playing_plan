import { describe, expect, it } from "vitest";
import { OTHER_DISTRICT_KEY, nearestDistrictKey, resolveDistrictKey } from "./districts";

describe("resolveDistrictKey", () => {
  it("nhận tên quận có dấu, không dấu, có tiền tố", () => {
    expect(resolveDistrictKey("Tây Hồ")).toBe("tay_ho");
    expect(resolveDistrictKey("Quận Hai Bà Trưng, Hà Nội")).toBe("hai_ba_trung");
    expect(resolveDistrictKey("cau giay")).toBe("cau_giay");
  });

  it("khu ghép lấy quận đầu tiên khớp, ngoài 7 quận trả về khác", () => {
    expect(resolveDistrictKey("Hoàn Kiếm - Long Biên")).toBe("hoan_kiem");
    expect(resolveDistrictKey("Gia Lâm")).toBe(OTHER_DISTRICT_KEY);
    expect(resolveDistrictKey(undefined)).toBe(OTHER_DISTRICT_KEY);
  });
});

describe("nearestDistrictKey", () => {
  it("đoán quận theo tâm gần nhất", () => {
    expect(nearestDistrictKey({ lat: 21.0285, lng: 105.8542 })).toBe("hoan_kiem"); // Hồ Gươm
    expect(nearestDistrictKey({ lat: 21.0583, lng: 105.8297 })).toBe("tay_ho"); // Hồ Tây
    expect(nearestDistrictKey({ lat: 21.0285, lng: 105.8021 })).toBe("cau_giay");
  });

  it("ngoài nội thành thì là khác", () => {
    expect(nearestDistrictKey({ lat: 10.7769, lng: 106.7009 })).toBe(OTHER_DISTRICT_KEY); // TP.HCM
  });
});
