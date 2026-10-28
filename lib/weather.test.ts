import { describe, it, expect, vi } from "vitest";
import { getWeatherForecast, FALLBACK_HANOI_WEATHER } from "./weather";

describe("Weather Client (Open-Meteo)", () => {
  it("should return fallback data when network fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network timeout")));
    const weather = await getWeatherForecast(21.03, 105.85);
    expect(weather).toEqual(FALLBACK_HANOI_WEATHER);
    vi.unstubAllGlobals();
  });

  it("should correctly parse and cache Open-Meteo API response", async () => {
    const mockResponse = {
      current: {
        temperature_2m: 25.4,
        apparent_temperature: 26.1,
        precipitation: 0,
        weather_code: 1,
      },
      hourly: {
        precipitation_probability: [10, 10, 10, 15, 20],
      },
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      })
    );

    const weather = await getWeatherForecast(20.0, 106.0);
    expect(weather.temp).toBe(25);
    expect(weather.icon).toBe("sun_cloud");
    expect(weather.condition).toContain("Mưa");
    expect(weather.weatherTip).toBeTruthy();
    vi.unstubAllGlobals();
  });
});
