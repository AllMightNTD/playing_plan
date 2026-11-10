import { describe, expect, it } from "vitest";
import {
  evaluatePlaceWeather,
  generateWeatherHeadline,
  getWeatherRecommendation,
  isExposedWindyArea,
  isWaterSportActivity,
  pickDiverseWeatherPlaces,
} from "./weather-recommendation";
import { SAMPLE_PLACES as HANOI_PLACES } from "@/server/test-fixtures/sample-places";
import type { WeatherData } from "./weather";

const MOCK_COLD_17C_WEATHER: WeatherData = {
  temp: 17,
  apparentTemp: 17,
  condition: "Trời nhiều mây, se lạnh",
  rainProbability: 10,
  icon: "cloud",
  weatherTip: "Thời tiết se lạnh 17°C, cực kỳ lãng mạn để ngồi cafe góc ban công hoặc đi ăn đồ nóng.",
};

const MOCK_RAINY_WEATHER: WeatherData = {
  temp: 22,
  apparentTemp: 22,
  condition: "Mưa rào • Mưa 80%",
  rainProbability: 80,
  icon: "rain",
  weatherTip: "Khả năng mưa cao (80%), nên ưu tiên các điểm hẹn hò ấm cúng trong nhà!",
};

const MOCK_HOT_35C_WEATHER: WeatherData = {
  temp: 35,
  apparentTemp: 38,
  condition: "Nắng gắt gay gắt",
  rainProbability: 5,
  icon: "sun",
  weatherTip: "Trời khá oi bức (35°C), nên chọn quán cafe máy lạnh có view đẹp.",
};

const MOCK_PLEASANT_24C_WEATHER: WeatherData = {
  temp: 24,
  apparentTemp: 24,
  condition: "Nắng thu dịu • Mưa 10%",
  rainProbability: 10,
  icon: "sun_cloud",
  weatherTip: "Trời ít mây, cực hợp săn hoàng hôn ngoài trời ở Cầu Long Biên hoặc Hồ Tây!",
};

describe("Weather Recommendation Engine (F12/Home Curation)", () => {
  describe("Phát hiện hoạt động nhạy cảm thời tiết", () => {
    it("nhận diện chính xác Chèo SUP & Kayak Hồ Tây là hoạt động thể thao nước", () => {
      const supPlace = HANOI_PLACES.find((p) => p.slug === "cheo-sup-kayak-hoang-hon-ho-tay")!;
      expect(supPlace).toBeDefined();
      expect(isWaterSportActivity(supPlace)).toBe(true);

      const aquarium = HANOI_PLACES.find((p) => p.slug === "thuy-cung-lotte-world-aquarium-tay-ho")!;
      expect(aquarium).toBeDefined();
      // Thủy cung là tham quan trong nhà mát mẻ, không phải thể thao nước ngoài trời
      expect(isWaterSportActivity(aquarium)).toBe(false);
    });

    it("nhận diện chính xác Bãi đá sông Hồng là bãi sông lộng gió", () => {
      const baiDaPlace = HANOI_PLACES.find((p) => p.slug === "bai-da-song-hong")!;
      expect(baiDaPlace).toBeDefined();
      expect(isExposedWindyArea(baiDaPlace)).toBe(true);
    });
  });

  describe("Kịch bản trời lạnh 17°C tại Hà Nội", () => {
    it("loại trừ dứt khoát Chèo SUP & Bãi đá sông Hồng khỏi top 3 gợi ý khi trời 17°C", () => {
      const baiDaPlace = HANOI_PLACES.find((p) => p.slug === "bai-da-song-hong")!;
      const supPlace = HANOI_PLACES.find((p) => p.slug === "cheo-sup-kayak-hoang-hon-ho-tay")!;

      const evalBaiDa = evaluatePlaceWeather(baiDaPlace, MOCK_COLD_17C_WEATHER);
      const evalSup = evaluatePlaceWeather(supPlace, MOCK_COLD_17C_WEATHER);

      expect(evalBaiDa.isStrictlyExcluded).toBe(true);
      expect(evalBaiDa.score).toBe(0);
      expect(evalSup.isStrictlyExcluded).toBe(true);
      expect(evalSup.score).toBe(0);

      // Chạy toàn bộ recommendation từ catalog 24 quán
      const result = getWeatherRecommendation(HANOI_PLACES, MOCK_COLD_17C_WEATHER, { limit: 3 });

      expect(result.places).toHaveLength(3);
      const recommendedSlugs = result.places.map((p) => p.slug);
      expect(recommendedSlugs).not.toContain("bai-da-song-hong");
      expect(recommendedSlugs).not.toContain("cheo-sup-kayak-hoang-hon-ho-tay");

      // Cả 3 quán gợi ý phải là không gian ấm cúng / đồ nóng / workshop
      for (const p of result.places) {
        expect(p.indoor || p.category === "food" || p.category === "cafe").toBe(true);
      }
    });

    it("sinh tiêu đề và phụ đề động sát với thực tế ngày se lạnh 17°C", () => {
      const { headline, subhead, weatherTag } = generateWeatherHeadline(MOCK_COLD_17C_WEATHER);
      expect(headline).toContain("17°C");
      expect(headline.toLowerCase()).toContain("se lạnh");
      expect(subhead.toLowerCase()).toContain("chèo thuyền");
      expect(weatherTag).toContain("se lạnh");
    });
  });

  describe("Kịch bản trời mưa rào (Rainy Scenario)", () => {
    it("chỉ gợi ý các địa điểm hoàn toàn trong nhà (indoor = true)", () => {
      const result = getWeatherRecommendation(HANOI_PLACES, MOCK_RAINY_WEATHER, { limit: 3 });
      expect(result.places).toHaveLength(3);
      for (const p of result.places) {
        expect(p.indoor).toBe(true);
      }
      expect(result.headline.toLowerCase()).toContain("mưa");
    });
  });

  describe("Kịch bản trời nắng nóng 35°C (Scorching Scenario)", () => {
    it("ưu tiên các địa điểm máy lạnh mát mẻ", () => {
      const result = getWeatherRecommendation(HANOI_PLACES, MOCK_HOT_35C_WEATHER, { limit: 3 });
      expect(result.places).toHaveLength(3);
      for (const p of result.places) {
        expect(p.indoor).toBe(true);
      }
      expect(result.headline.toLowerCase()).toContain("nắng gắt");
    });
  });

  describe("Kịch bản trời thu mát mẻ 24°C (Pleasant Scenario)", () => {
    it("ưu tiên ngắm hoàng hôn và hoạt động ngoài trời thoáng đãng", () => {
      const result = getWeatherRecommendation(HANOI_PLACES, MOCK_PLEASANT_24C_WEATHER, { limit: 3 });
      expect(result.places).toHaveLength(3);
      const hasOutdoor = result.places.some((p) => !p.indoor);
      expect(hasOutdoor).toBe(true);
      expect(result.headline.toLowerCase()).toContain("dịu mát");
    });
  });

  describe("Đa dạng hóa danh mục (Category Diversity)", () => {
    it("không gợi ý 3 quán cùng 1 danh mục nếu có lựa chọn thay thế", () => {
      const result = getWeatherRecommendation(HANOI_PLACES, MOCK_COLD_17C_WEATHER, { limit: 3 });
      const categories = result.places.map((p) => p.category);
      const uniqueCategories = new Set(categories);
      expect(uniqueCategories.size).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Xử lý dữ liệu biên (Graceful Fallbacks)", () => {
    it("trả về fallback an toàn khi weather là null", () => {
      const result = getWeatherRecommendation(HANOI_PLACES, null, { limit: 3 });
      expect(result.places).toHaveLength(3);
      expect(result.headline).toBe("Hợp với thời tiết Hà Nội hôm nay");
    });

    it("trả về mảng rỗng khi places là rỗng", () => {
      const result = getWeatherRecommendation([], MOCK_COLD_17C_WEATHER, { limit: 3 });
      expect(result.places).toEqual([]);
    });
  });
});

