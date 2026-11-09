import type { HanoiPlace } from "@/lib/types/catalog";
import type { WeatherData } from "@/lib/weather";

export interface WeatherPlaceEvaluation {
  place: HanoiPlace;
  score: number;
  isStrictlyExcluded: boolean;
  exclusionReason?: string;
  weatherBadge?: string;
  suitabilityReason: string;
}

export interface WeatherRecommendationResult {
  headline: string;
  subhead: string;
  places: HanoiPlace[];
  weatherTag: string;
  evaluations: Map<string, WeatherPlaceEvaluation>;
}

// Temperature Thresholds (°C)
export const WEATHER_THRESHOLDS = {
  FREEZING: 15, // Rất lạnh / rét đậm
  COLD: 19, // Se lạnh / lạnh
  MILD_MIN: 20, // Bắt đầu dễ chịu
  MILD_MAX: 30, // Dễ chịu mát mẻ
  HOT: 32, // Oi bức
  SCORCHING: 35, // Nắng gắt
} as const;

// Water sports or direct water immersion (dangerous / shivering in cold weather)
const WATER_SPORT_KEYWORDS = [
  "chèo sup",
  "cheo sup",
  "sup & kayak",
  "kayak",
  "lướt ván",
  "thể thao nước",
  "thuyền kayak",
  "bơi lội",
  "công viên nước",
];

// Open riverbanks / exposed fields with strong wind chill
const EXPOSED_WINDY_KEYWORDS = [
  "bãi đá sông hồng",
  "bai da song hong",
  "bãi bồi",
  "bờ sông lộng gió",
  "đồng cỏ lau",
  "bãi giữa",
];

// Warm winter comfort food and hot specialty drinks
const WARM_COMFORT_FOOD_KEYWORDS = [
  "gà tần",
  "lẩu",
  "nướng",
  "ẩm thực",
  "tống duy tân",
  "ốc nóng",
  "xôi chim",
  "cháo",
  "cà phê trứng",
  "cafe trứng",
];

// Cozy indoor activities (craft workshops, art galleries, museums, cinema)
const COZY_WORKSHOP_ART_KEYWORDS = [
  "gốm",
  "workshop",
  "nến thơm",
  "bảo tàng",
  "triển lãm",
  "rạp phim",
  "sweetbox",
  "vcca",
  "hỏa lò",
  "complex 01",
];

export function isWaterSportActivity(place: HanoiPlace): boolean {
  if (place.indoor) return false;
  const text = `${place.slug} ${place.name} ${place.categoryLabel} ${place.summary}`.toLowerCase();
  return WATER_SPORT_KEYWORDS.some((kw) => text.includes(kw));
}

export function isExposedWindyArea(place: HanoiPlace): boolean {
  if (place.indoor) return false;
  const text = `${place.slug} ${place.name} ${place.summary}`.toLowerCase();
  return EXPOSED_WINDY_KEYWORDS.some((kw) => text.includes(kw));
}

function hasWarmFoodOrDrink(place: HanoiPlace): boolean {
  const text = `${place.slug} ${place.name} ${place.summary} ${place.tips}`.toLowerCase();
  return (
    (place.category === "food" || place.category === "cafe" || place.moods.includes("food")) &&
    WARM_COMFORT_FOOD_KEYWORDS.some((kw) => text.includes(kw))
  );
}

function isCozyWorkshopOrArt(place: HanoiPlace): boolean {
  const text = `${place.slug} ${place.name} ${place.summary} ${place.categoryLabel}`.toLowerCase();
  return COZY_WORKSHOP_ART_KEYWORDS.some((kw) => text.includes(kw));
}

/**
 * Evaluates how suitable a place is given current weather conditions.
 */
export function evaluatePlaceWeather(
  place: HanoiPlace,
  weather: WeatherData
): WeatherPlaceEvaluation {
  const effectiveTemp = weather.apparentTemp ?? weather.temp;
  const isRainy = weather.icon === "rain" || weather.icon === "thunder" || weather.rainProbability >= 60;

  // 1. Strict Exclusions (Negative absolute constraints)
  if (isRainy && !place.indoor) {
    return {
      place,
      score: 0,
      isStrictlyExcluded: true,
      exclusionReason: "Trời mưa ướt, không thích hợp cho hoạt động ngoài trời",
      suitabilityReason: "Không phù hợp khi trời mưa",
    };
  }

  // Cold weather exclusions (< 20°C): No water sports / kayaking / SUP
  if (effectiveTemp <= WEATHER_THRESHOLDS.COLD && isWaterSportActivity(place)) {
    return {
      place,
      score: 0,
      isStrictlyExcluded: true,
      exclusionReason: `Trời lạnh (${effectiveTemp}°C), hoạt động thể thao nước/chèo SUP có nguy cơ rét cóng`,
      suitabilityReason: "Không phù hợp khi trời lạnh",
    };
  }

  // Very cold / freezing weather exclusions (<= 18°C): Riverbanks with heavy wind chill are excluded
  if (effectiveTemp <= 18 && isExposedWindyArea(place)) {
    return {
      place,
      score: 0,
      isStrictlyExcluded: true,
      exclusionReason: `Trời lạnh (${effectiveTemp}°C), bãi sông lộng gió rét buốt không thể dã ngoại/picnic`,
      suitabilityReason: "Gió sông rét buốt, không hợp ngày lạnh",
    };
  }

  // Scorching weather (> 34°C): Exposed fields with no shade
  if (effectiveTemp >= 34 && isExposedWindyArea(place)) {
    return {
      place,
      score: 10,
      isStrictlyExcluded: false,
      exclusionReason: undefined,
      weatherBadge: "⚠️ Nắng gắt",
      suitabilityReason: "Bãi sông trảng cỏ rất nắng nóng giữa ngày hè",
    };
  }

  // 2. Score Calculation (0 - 100)
  let score = 50;
  let weatherBadge: string | undefined;
  let suitabilityReason = "Phù hợp với thời tiết hôm nay";

  if (effectiveTemp <= WEATHER_THRESHOLDS.COLD) {
    // Cold Scenario
    if (place.indoor) {
      score += 35;
      weatherBadge = "❄️ Tránh gió lạnh";
      suitabilityReason = "Không gian kín gió, ấm cúng ngày lạnh";
    }

    if (hasWarmFoodOrDrink(place)) {
      score += 35;
      weatherBadge = "🍲 Đồ ăn ấm nóng";
      suitabilityReason = "Ẩm thực và đồ uống nóng hổi sưởi ấm ngày lạnh";
    } else if (isCozyWorkshopOrArt(place)) {
      score += 25;
      weatherBadge = "🏺 Workshop ấm áp";
      suitabilityReason = "Trải nghiệm sáng tạo thư thả trong nhà";
    }

    if (!place.indoor) {
      // Outdoor places penalised in cold weather
      score -= effectiveTemp <= WEATHER_THRESHOLDS.FREEZING ? 35 : 20;
      if (place.category === "walk" || place.slug.includes("phan-dinh-phung")) {
        weatherBadge = "🧣 Dạo phố khăn len";
        suitabilityReason = "Dạo phố lãng mạn mặc áo ấm";
        score += 10; // Hanoi iconic autumn/winter walk
      }
    }
  } else if (effectiveTemp >= WEATHER_THRESHOLDS.HOT) {
    // Hot Scenario
    if (place.indoor) {
      score += 40;
      weatherBadge = "❄️ Điều hòa mát rượi";
      suitabilityReason = "Tránh nóng lý tưởng với không gian máy lạnh";
    } else {
      score -= 25;
    }

    if (isWaterSportActivity(place) && !isRainy) {
      score += 30;
      weatherBadge = "🏄‍♂️ Giải nhiệt hoàng hôn";
      suitabilityReason = "Thể thao nước mát lạnh đón hoàng hôn chiều tà";
    }
  } else if (isRainy) {
    // Rainy Scenario
    if (place.indoor) {
      score += 45;
      weatherBadge = "☔ Trú mưa ấm cúng";
      suitabilityReason = "Không gian trong nhà an tâm không ngại mưa gió";
    }
  } else {
    // Mild / Pleasant Scenario (20°C - 30°C)
    if (!place.indoor) {
      score += 35;
      weatherBadge = "🌅 Săn hoàng hôn đẹp";
      suitabilityReason = "Thời tiết mát mẻ tuyệt đẹp để ngắm cảnh ngoài trời";
    } else {
      score += 15;
      weatherBadge = "☕ Hẹn hò thư thái";
      suitabilityReason = "Không gian thư thả cho cặp đôi";
    }

    if (isWaterSportActivity(place) && effectiveTemp >= 23) {
      score += 20;
      weatherBadge = "🏄‍♂️ Lướt ván ngắm hoàng hôn";
    }
  }

  // Minor bonus for high ratings or iconic places
  if (place.priceLevel === 1 || place.priceLevel === 2) {
    score += 5;
  }

  return {
    place,
    score: Math.min(100, Math.max(0, score)),
    isStrictlyExcluded: false,
    weatherBadge,
    suitabilityReason,
  };
}

/**
 * Generates an evocative, weather-aware headline and subhead for Hanoi couples.
 */
export function generateWeatherHeadline(weather: WeatherData): {
  headline: string;
  subhead: string;
  weatherTag: string;
} {
  const temp = weather.apparentTemp ?? weather.temp;
  const isRainy = weather.icon === "rain" || weather.icon === "thunder" || weather.rainProbability >= 60;

  if (isRainy) {
    return {
      headline: "Trời mưa rào, trốn vào những góc hẹn hò ấm cúng nhé",
      subhead: "DateMate ưu tiên không gian trong nhà kín gió, workshop sáng tạo, rạp phim và quán cafe có mái che.",
      weatherTag: "☔ Gợi ý ngày mưa",
    };
  }

  if (temp <= WEATHER_THRESHOLDS.FREEZING) {
    return {
      headline: `Hà Nội rét đậm (${temp}°C) • Ưu tiên góc ấm & món nóng`,
      subhead: "Trời lạnh tránh bãi sông lộng gió hay chèo thuyền; DateMate gợi ý quán trong nhà ấm cúng, cafe trứng và lẩu nướng nóng hổi.",
      weatherTag: "🧣 Gợi ý ngày rét",
    };
  }

  if (temp <= WEATHER_THRESHOLDS.COLD) {
    return {
      headline: `Hà Nội se lạnh (${temp}°C) • Ghé những góc ấm áp này nhé`,
      subhead: "Trời se lạnh nên tránh ra bãi sông lộng gió hay chèo thuyền; DateMate ưu tiên cafe ấm cúng, workshop nặn gốm đôi và ẩm thực ấm bụng.",
      weatherTag: "☕ Gợi ý ngày se lạnh",
    };
  }

  if (temp >= WEATHER_THRESHOLDS.SCORCHING) {
    return {
      headline: `Hà Nội nắng gắt (${temp}°C) • Trốn nắng máy lạnh mát rượi`,
      subhead: "Ưu tiên không gian máy lạnh mát mẻ như thủy cung, triển lãm nghệ thuật và rạp phim; hoạt động ngoài trời nên đợi sau 17:30.",
      weatherTag: "❄️ Trốn nắng máy lạnh",
    };
  }

  if (temp >= WEATHER_THRESHOLDS.HOT) {
    return {
      headline: `Hà Nội oi bức (${temp}°C) • Hẹn hò mát mẻ thư thái`,
      subhead: "Gợi ý các góc cafe máy lạnh view đẹp ban ngày và đón gió hoàng hôn lãng mạn khi chiều buông dịu mát.",
      weatherTag: "🍃 Giải nhiệt ngày hè",
    };
  }

  return {
    headline: `Hà Nội dịu mát (${temp}°C) • Thời tiết lý tưởng để dạo phố`,
    subhead: "Trời mát mẻ nắng nhẹ, cực kỳ lý tưởng để hai bạn nắm tay dạo phố cổ, cầu Long Biên và đón hoàng hôn Hồ Tây.",
    weatherTag: "🌤️ Thời tiết lý tưởng",
  };
}

/**
 * Pick diverse places by category so the top 3 cards don't show identical types (e.g. 3 cafes in a row).
 */
export function pickDiverseWeatherPlaces(
  evaluations: WeatherPlaceEvaluation[],
  limit: number = 3
): HanoiPlace[] {
  const valid = evaluations
    .filter((e) => !e.isStrictlyExcluded && e.score > 0)
    .sort((a, b) => b.score - a.score);

  if (valid.length === 0) {
    // Graceful fallback: return top places regardless of strict flags
    return evaluations.slice(0, limit).map((e) => e.place);
  }

  const selected: HanoiPlace[] = [];
  const usedCategories = new Set<string>();

  // Pass 1: Try picking different categories
  for (const item of valid) {
    if (selected.length >= limit) break;
    const cat = item.place.category;
    if (!usedCategories.has(cat)) {
      selected.push(item.place);
      usedCategories.add(cat);
    }
  }

  // Pass 2: Fill remaining slots by highest score
  for (const item of valid) {
    if (selected.length >= limit) break;
    if (!selected.some((p) => p.id === item.place.id)) {
      selected.push(item.place);
    }
  }

  return selected;
}

/**
 * Main Orchestrator: Computes weather-driven recommendations for the homepage preview.
 */
export function getWeatherRecommendation(
  places: HanoiPlace[],
  weather?: WeatherData | null,
  options: { limit?: number } = {}
): WeatherRecommendationResult {
  const limit = options.limit ?? 3;

  if (!weather || places.length === 0) {
    const defaultPlaces = places.slice(0, limit);
    return {
      headline: "Hợp với thời tiết Hà Nội hôm nay",
      subhead: "Gợi ý các tọa độ hẹn hò được nhiều cặp đôi yêu thích nhất",
      places: defaultPlaces,
      weatherTag: "🧭 Gợi ý hôm nay",
      evaluations: new Map(),
    };
  }

  const { headline, subhead, weatherTag } = generateWeatherHeadline(weather);
  const evaluationList = places.map((place) => evaluatePlaceWeather(place, weather));
  const evalMap = new Map(evaluationList.map((e) => [e.place.id, e]));

  const recommendedPlaces = pickDiverseWeatherPlaces(evaluationList, limit);

  return {
    headline,
    subhead,
    places: recommendedPlaces,
    weatherTag,
    evaluations: evalMap,
  };
}
