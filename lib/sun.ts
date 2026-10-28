import SunCalc from "suncalc";

export interface GoldenHourTimes {
  sunrise: string;
  goldenHourMorning: { start: string; end: string };
  sunset: string;
  goldenHourEvening: { start: string; end: string };
  blueHour: { start: string; end: string };
}

export const VN_TIME_ZONE = "Asia/Ho_Chi_Minh";

const vnTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: VN_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function formatTime(date: Date): string {
  return vnTimeFormatter.format(date);
}

/**
 * Tính toán giờ vàng và giờ xanh theo tọa độ và ngày
 * Mặc định múi giờ Asia/Ho_Chi_Minh
 */
export function getBestTimes(lat: number, lng: number, date: Date = new Date()): GoldenHourTimes {
  const times = SunCalc.getTimes(date, lat, lng);

  // Giờ vàng sáng: từ sunrise đến +60 phút
  const sunrise = times.sunrise;
  const goldenHourMorningEnd = new Date(sunrise.getTime() + 60 * 60 * 1000);

  // Giờ vàng chiều: 60 phút trước sunset đến sunset
  const sunset = times.sunset;
  const goldenHourEveningStart = new Date(sunset.getTime() - 60 * 60 * 1000);

  // Giờ xanh: từ sunset đến +30 phút
  const blueHourEnd = new Date(sunset.getTime() + 30 * 60 * 1000);

  return {
    sunrise: formatTime(sunrise),
    goldenHourMorning: {
      start: formatTime(sunrise),
      end: formatTime(goldenHourMorningEnd),
    },
    sunset: formatTime(sunset),
    goldenHourEvening: {
      start: formatTime(goldenHourEveningStart),
      end: formatTime(sunset),
    },
    blueHour: {
      start: formatTime(sunset),
      end: formatTime(blueHourEnd),
    },
  };
}
