/**
 * Pure calculation engine for DateMate Plan Timeline & Itinerary Optimizer
 *
 * Implements:
 * 1. Time parsing and formatting (minutes <-> HH:mm)
 * 2. Realistic Hanoi road travel distance (Haversine * 1.35 factor) and travel time with parking buffer
 * 3. Chained timeline calculation with conflict warnings and golden hour overlap detection
 * 4. AI Itinerary sequencing optimization
 */

export interface LatLngLike {
  lat?: number | null;
  lng?: number | null;
}

export interface ComputedTimelineItem<T> {
  item: T;
  index: number;
  startTimeStr: string;
  endTimeStr: string;
  startMin: number;
  endMin: number;
  distKm: number;
  travelMins: number;
  timeConflictWarning: string | null;
  overlapsGoldenHour: boolean;
}

export interface ItineraryStats {
  totalKm: string;
  totalDurationStr: string;
  startStr: string;
  endStr: string;
}

const DEFAULT_START_TIME = "15:00";
const ROAD_FACTOR = 1.35;
const EARTH_RADIUS_KM = 6371;
// Default golden hour in Hanoi: 16:23 (983 min) - 17:23 (1043 min)
const DEFAULT_GOLDEN_HOUR_START_MIN = 983;
const DEFAULT_GOLDEN_HOUR_END_MIN = 1043;

const WEEKDAY_NAMES = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

/**
 * Converts "HH:mm" time string to minutes from midnight (0..1439).
 */
export function timeToMinutes(timeStr: string | null | undefined): number {
  if (!timeStr || typeof timeStr !== "string" || !timeStr.includes(":")) {
    return 900; // 15:00 default
  }
  const [hStr, mStr] = timeStr.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (!Number.isFinite(h) || !Number.isFinite(m)) {
    return 900;
  }
  return h * 60 + m;
}

/**
 * Formats minutes from midnight into normalized "HH:mm" 24h string.
 */
export function minutesToTime(totalMinutes: number): string {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = Math.round(normalized % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Calculates road distance (km) between 2 stops in Hanoi using Haversine formula
 * with a 1.35 road winding factor. Returns 0 if either point lacks valid coordinates.
 */
export function calculateDistanceKm(
  stopA?: LatLngLike | null,
  stopB?: LatLngLike | null
): number {
  if (
    !stopA ||
    !stopB ||
    typeof stopA.lat !== "number" ||
    typeof stopA.lng !== "number" ||
    typeof stopB.lat !== "number" ||
    typeof stopB.lng !== "number" ||
    !Number.isFinite(stopA.lat) ||
    !Number.isFinite(stopA.lng) ||
    !Number.isFinite(stopB.lat) ||
    !Number.isFinite(stopB.lng)
  ) {
    return 0;
  }

  const dLat = ((stopB.lat - stopA.lat) * Math.PI) / 180;
  const dLng = ((stopB.lng - stopA.lng) * Math.PI) / 180;

  const lat1 = (stopA.lat * Math.PI) / 180;
  const lat2 = (stopB.lat * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const roadDist = Math.max(0.6, EARTH_RADIUS_KM * c * ROAD_FACTOR);
  return Number(roadDist.toFixed(1));
}

/**
 * Computes estimated travel time (minutes) in Hanoi including parking buffer.
 * Average inner-city speed: ~20 km/h + 8 min parking buffer, rounded to nearest 5 mins (minimum 10 mins).
 */
export function calculateTravelMinutes(distKm: number): number {
  if (distKm <= 0) return 10;
  const rideMins = Math.ceil((distKm / 20) * 60);
  const parkingMins = 8;
  return Math.max(10, Math.round((rideMins + parkingMins) / 5) * 5);
}

/**
 * Formats "YYYY-MM-DD" date into friendly Vietnamese string like "CN, 01/11".
 */
export function formatVietnameseDate(dateStr: string | null | undefined): string {
  if (!dateStr || typeof dateStr !== "string") return "CN, 01/11";
  const parts = dateStr.split("-").map(Number);
  if (parts.length !== 3 || parts.some((p) => !Number.isFinite(p))) {
    return "CN, 01/11";
  }
  const [y, m, d] = parts;
  const dateObj = new Date(y, m - 1, d);
  if (Number.isNaN(dateObj.getTime())) return "CN, 01/11";

  const weekday = WEEKDAY_NAMES[dateObj.getDay()] || "CN";
  return `${weekday}, ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
}

/**
 * Computes chained timeline for plan stops, calculating arrival times, departures,
 * travel time between consecutive stops, conflict warnings, and sunset overlap.
 */
export function computePlanTimeline<
  T extends {
    duration?: number | null;
    isLocked?: boolean | null;
    lockedStartTime?: string | null;
    lat?: number | null;
    lng?: number | null;
  }
>(
  stops: T[],
  startTime: string | null = DEFAULT_START_TIME,
  goldenHour = { startMin: DEFAULT_GOLDEN_HOUR_START_MIN, endMin: DEFAULT_GOLDEN_HOUR_END_MIN }
): ComputedTimelineItem<T>[] {
  let currentMin = timeToMinutes(startTime || DEFAULT_START_TIME);

  return stops.map((stop, idx) => {
    const prevStop = idx > 0 ? stops[idx - 1] : null;
    const distKm = idx === 0 ? 0 : calculateDistanceKm(prevStop, stop);
    const travelMins = idx === 0 ? 0 : calculateTravelMinutes(distKm);

    let startMin = currentMin + travelMins;
    let timeConflictWarning: string | null = null;

    if (stop.isLocked && stop.lockedStartTime) {
      const lockedMin = timeToMinutes(stop.lockedStartTime);
      if (idx > 0 && lockedMin < startMin) {
        timeConflictWarning = `Giờ cố định (${stop.lockedStartTime}) sớm hơn giờ di chuyển dự kiến (${minutesToTime(startMin)})`;
      }
      startMin = lockedMin;
    }

    const duration = Number(stop.duration) || 60;
    const endMin = startMin + duration;
    currentMin = endMin;

    const startTimeStr = minutesToTime(startMin);
    const endTimeStr = minutesToTime(endMin);

    const overlapsGoldenHour =
      startMin <= goldenHour.endMin && endMin >= goldenHour.startMin;

    return {
      item: stop,
      index: idx,
      startTimeStr,
      endTimeStr,
      startMin,
      endMin,
      distKm,
      travelMins,
      timeConflictWarning,
      overlapsGoldenHour,
    };
  });
}

/**
 * Computes overall itinerary summary statistics (total km, duration, span).
 */
export function computeItineraryStats(
  computedTimeline: Array<{
    distKm: number;
    startMin: number;
    endMin: number;
    startTimeStr: string;
    endTimeStr: string;
  }>
): ItineraryStats {
  if (computedTimeline.length === 0) {
    return {
      totalKm: "0.0",
      totalDurationStr: "0 giờ",
      startStr: "--:--",
      endStr: "--:--",
    };
  }

  const totalKmNum = computedTimeline.reduce((acc, s) => acc + s.distKm, 0);
  const totalKm = totalKmNum.toFixed(1);

  const firstMin = computedTimeline[0].startMin;
  const lastMin = computedTimeline[computedTimeline.length - 1].endMin;
  const diffMins = Math.max(0, lastMin - firstMin);
  const hrs = Math.floor(diffMins / 60);
  const mins = diffMins % 60;

  const durationParts: string[] = [];
  if (hrs > 0) durationParts.push(`${hrs}h`);
  if (mins > 0 || hrs === 0) durationParts.push(`${mins}p`);
  const totalDurationStr = durationParts.join(" ") || "0p";

  return {
    totalKm,
    totalDurationStr,
    startStr: computedTimeline[0].startTimeStr,
    endStr: computedTimeline[computedTimeline.length - 1].endTimeStr,
  };
}

/**
 * AI Itinerary Optimizer: Orders stops logically according to couple date dynamics:
 * 1. Warm-up coffee (15:00 - 16:00)
 * 2. Activity / Museum / Golden hour sunset (16:15 - 17:30)
 * 3. Dinner / Food (17:45 - 18:45)
 * 4. Closing intimate coffee / chill
 */
export function optimizeItinerarySequence<
  T extends {
    category?: string | null;
    duration?: number | null;
  }
>(
  stops: T[]
): {
  recommendedStartTime: string;
  reason: string;
  stops: Array<T & { isLocked?: boolean; lockedStartTime?: string | null; duration?: number }>;
} {
  const roleOrder: Record<string, number> = {
    coffee: 1,
    activity: 2,
    sunset: 2,
    food: 3,
  };

  const copy = [...stops];
  let firstCoffeeAssigned = false;

  const scored = copy.map((stop) => {
    const cat = (stop.category || "activity").toLowerCase();
    let score = roleOrder[cat] || 2;
    if (cat === "coffee") {
      const name = ((stop as { name?: string | null }).name || "").toLowerCase();
      const isEvening =
        name.includes("tối") ||
        name.includes("đêm") ||
        name.includes("muộn") ||
        name.includes("chill");

      if (isEvening) {
        score = 4;
      } else if (!firstCoffeeAssigned) {
        score = 1;
        firstCoffeeAssigned = true;
      } else {
        score = 4;
      }
    }
    return { stop, score };
  });

  scored.sort((a, b) => a.score - b.score);

  const optimizedStops = scored.map(({ stop }, idx) => {
    const isSunsetOrActivity = idx === 1;
    return {
      ...stop,
      isLocked: isSunsetOrActivity,
      lockedStartTime: isSunsetOrActivity ? "16:15" : null,
      duration: isSunsetOrActivity ? 70 : Number(stop.duration) || 60,
    };
  });

  return {
    recommendedStartTime: "15:00",
    reason:
      "Tối ưu theo nhịp sinh học buổi hẹn: Mở đầu Cafe làm quen (15:00) ➔ Tham quan & Chụp ảnh đúng Giờ Vàng Hoàng Hôn (16:15 - 17:25) ➔ Ăn tối nạp năng lượng (17:40) ➔ Cafe tâm sự tối gần khu vực, giảm thiểu quãng đường di chuyển lòng vòng.",
    stops: optimizedStops,
  };
}
