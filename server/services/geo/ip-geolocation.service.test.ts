import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { lookupIpLocation, parseGeoResponse } from "./ip-geolocation.service";

describe("parseGeoResponse", () => {
  it("đọc định dạng v1 (trường phẳng, tọa độ dạng chuỗi) và lấy quận theo tên", () => {
    expect(
      parseGeoResponse({ latitude: "21.01300", longitude: "105.82700", city: "Hanoi", district: "Dong Da", country_code2: "VN" })
    ).toMatchObject({ lat: 21.013, lng: 105.827, districtKey: "dong_da", districtName: "Đống Đa", countryCode: "VN", source: "ip" });
  });

  it("đọc định dạng v2 (location.*) và đoán quận theo tọa độ khi thiếu tên quận", () => {
    expect(parseGeoResponse({ location: { latitude: "21.0285", longitude: "105.8542", city: "Hanoi" } })).toMatchObject({
      districtKey: "hoan_kiem",
    });
  });

  it("phản hồi không có tọa độ hợp lệ thì null", () => {
    expect(parseGeoResponse({ message: "Invalid API key" })).toBeNull();
    expect(parseGeoResponse({ latitude: "0", longitude: "0" })).toBeNull();
  });
});

describe("lookupIpLocation", () => {
  const originalKey = process.env.IP_GEOLOCATION_API_KEY;

  beforeEach(() => {
    process.env.IP_GEOLOCATION_API_KEY = "test-key";
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalKey === undefined) delete process.env.IP_GEOLOCATION_API_KEY;
    else process.env.IP_GEOLOCATION_API_KEY = originalKey;
  });

  it("thiếu key thì không gọi API", async () => {
    delete process.env.IP_GEOLOCATION_API_KEY;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await lookupIpLocation("1.2.3.4")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("gửi IP công khai kèm key và cache kết quả", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ latitude: "21.07", longitude: "105.818" }) });
    vi.stubGlobal("fetch", fetchMock);

    const first = await lookupIpLocation("203.0.113.7", 1000);
    const second = await lookupIpLocation("203.0.113.7", 2000);

    expect(first?.districtKey).toBe("tay_ho");
    expect(second).toEqual(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.searchParams.get("ip")).toBe("203.0.113.7");
    expect(url.searchParams.get("apiKey")).toBe("test-key");
  });

  it("IP nội bộ (localhost) không gửi tham số ip; lỗi mạng trả null và không cache", async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error("timeout")).mockResolvedValue({
      ok: true,
      json: async () => ({ latitude: "21.0285", longitude: "105.8542" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    expect(await lookupIpLocation("127.0.0.1", 5000)).toBeNull();
    const retried = await lookupIpLocation("127.0.0.1", 6000);
    expect(retried?.districtKey).toBe("hoan_kiem");
    expect(new URL(String(fetchMock.mock.calls[1][0])).searchParams.has("ip")).toBe(false);
  });

  it("production: IP nội bộ (thiếu header proxy) thì không tra, tránh trả vị trí máy chủ", async () => {
    const env = process.env as Record<string, string | undefined>;
    const original = env.NODE_ENV;
    env.NODE_ENV = "production";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    try {
      expect(await lookupIpLocation("127.0.0.1", 9000)).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      env.NODE_ENV = original;
    }
  });
});
