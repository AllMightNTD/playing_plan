/**
 * Open-Meteo Cache Client & Weather Helper (F12)
 * Hoàn toàn miễn phí, không cần API key.
 * Cache in-memory 30 phút theo tọa độ làm tròn.
 */

export interface WeatherData {
  temp: number;
  apparentTemp: number;
  condition: string;
  rainProbability: number;
  icon: "sun" | "sun_cloud" | "cloud" | "rain" | "thunder";
  weatherTip: string;
}

interface CachedWeather {
  data: WeatherData;
  expiresAt: number;
}

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 phút
const weatherCache = new Map<string, CachedWeather>();

// Fallback an toàn khi offline hoặc mạng lỗi
export const FALLBACK_HANOI_WEATHER: WeatherData = {
  temp: 26,
  apparentTemp: 27,
  condition: "Nắng thu dịu • Mưa 10%",
  rainProbability: 10,
  icon: "sun_cloud",
  weatherTip:
    "Xác suất mưa thấp (10%), trời ít mây, cực hợp săn hoàng hôn ngoài trời ở Cầu Long Biên hoặc Hồ Tây!",
};

/**
 * Ánh xạ mã thời tiết WMO (WMO Weather interpretation codes) sang tiếng Việt và icon
 */
function interpretWeatherCode(code: number, rainProb: number): { condition: string; icon: WeatherData["icon"] } {
  if (code === 0) {
    return { condition: `Trời quang đãng • Mưa ${rainProb}%`, icon: "sun" };
  }
  if (code >= 1 && code <= 3) {
    return { condition: `Nắng thu dịu • Mưa ${rainProb}%`, icon: "sun_cloud" };
  }
  if (code >= 45 && code <= 48) {
    return { condition: `Sương mù nhẹ • Mưa ${rainProb}%`, icon: "cloud" };
  }
  if (code >= 51 && code <= 67) {
    return { condition: `Mưa rào nhẹ • Mưa ${rainProb}%`, icon: "rain" };
  }
  if (code >= 80 && code <= 82) {
    return { condition: `Mưa rào • Mưa ${rainProb}%`, icon: "rain" };
  }
  if (code >= 95) {
    return { condition: `Có dông bão • Mưa ${rainProb}%`, icon: "thunder" };
  }
  return { condition: `Trời mát mẻ • Mưa ${rainProb}%`, icon: "sun_cloud" };
}

/**
 * Sinh lời khuyên hẹn hò thông minh theo thời tiết (F12)
 */
function generateWeatherTip(rainProbability: number, temp: number): string {
  if (rainProbability >= 50) {
    return `Khả năng mưa cao (${rainProbability}%), nên ưu tiên các điểm hẹn hò ấm cúng trong nhà (workshop, cafe sách, bảo tàng nghệ thuật)!`;
  }
  if (temp >= 33) {
    return `Trời khá oi bức (${temp}°C), nên chọn quán cafe máy lạnh có view đẹp vào ban ngày và hẹn hò ngoài trời sau 17:30 khi dịu mát.`;
  }
  if (temp <= 18) {
    return `Thời tiết se lạnh (${temp}°C), cực kỳ lãng mạn để dạo phố, đi ăn lẩu nướng hoặc ngồi cafe góc ban công ngắm phố cổ.`;
  }
  return `Xác suất mưa thấp (${rainProbability}%), trời ít mây dịu mát, cực hợp săn hoàng hôn ngoài trời ở Cầu Long Biên hoặc Hồ Tây!`;
}

/**
 * Lấy thông tin thời tiết Hà Nội (hoặc tọa độ bất kỳ) từ Open-Meteo
 */
export async function getWeatherForecast(lat = 21.0285, lng = 105.8542): Promise<WeatherData> {
  const roundedLat = lat.toFixed(2);
  const roundedLng = lng.toFixed(2);
  const cacheKey = `${roundedLat},${roundedLng}`;

  const cached = weatherCache.get(cacheKey);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${roundedLat}&longitude=${roundedLng}&current=temperature_2m,apparent_temperature,precipitation,weather_code&hourly=precipitation_probability&timezone=Asia%2FBangkok&forecast_days=1`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000); // 4s timeout

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`Open-Meteo returned status ${res.status}`);
    }

    const data = await res.json();
    const current = data.current;
    const temp = Math.round(current.temperature_2m);
    const apparentTemp = Math.round(current.apparent_temperature);
    const weatherCode = Number(current.weather_code ?? 1);

    // Lấy xác suất mưa theo giờ hiện tại
    const currentHour = new Date().getHours();
    const hourlyProbs = (data.hourly?.precipitation_probability as number[]) || [];
    const rainProbability = hourlyProbs[currentHour] ?? Math.round(Number(current.precipitation ?? 0) * 10);

    const { condition, icon } = interpretWeatherCode(weatherCode, rainProbability);
    const weatherTip = generateWeatherTip(rainProbability, temp);

    const weatherResult: WeatherData = {
      temp,
      apparentTemp,
      condition,
      rainProbability,
      icon,
      weatherTip,
    };

    weatherCache.set(cacheKey, {
      data: weatherResult,
      expiresAt: now + CACHE_TTL_MS,
    });

    return weatherResult;
  } catch {
    // Fallback an toàn nếu lỗi mạng
    return FALLBACK_HANOI_WEATHER;
  }
}
