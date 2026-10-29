import { getUserRepositories } from "@/server/db/repositories";
import { getAllPublishedPlaces } from "@/server/services/user/places.service";
import { loadEditablePlan, toPlanScope, toPlanTouch, getPlanDetail } from "@/server/services/user/plan.service";
import { calculateHanoiTravelMinutes } from "@/lib/travel-time";
import { getBestTimes } from "@/lib/sun";
import { getWeatherForecast } from "@/lib/weather";
import { AppError, ERRORS } from "@/server/http/errors";
import type { MemberSession, PlanScope } from "@/server/db/repositories/types";
import type { PlanDetailDto } from "@/server/services/user/plan.mapper";

/**
 * Chuyển số phút trong ngày (0..1439+) thành chuỗi "HH:mm".
 */
export function minuteToTimeString(minute: number): string {
  const normalized = ((minute % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

/**
 * Chuyển chuỗi "HH:mm" thành số phút trong ngày.
 */
export function timeStringToMinute(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  const hours = Number.isFinite(h) ? h : 0;
  const mins = Number.isFinite(m) ? m : 0;
  return hours * 60 + mins;
}

/**
 * Auto-Ripple Engine (Đẩy giờ dây chuyền):
 * Khi người dùng tăng/giảm giờ tại một chặng (±15p),
 * hệ thống tự động đẩy giờ tất cả các chặng tiếp theo (trừ những chặng đã ghim giờ 📌).
 * Bảo vệ xung đột đồng thời bằng Optimistic Locking (`expectedVersion`).
 */
export async function shiftPlanSchedule(
  session: MemberSession,
  planId: string,
  input: {
    stopId: string;
    shiftMinutes: number;
    expectedVersion: number;
  }
): Promise<PlanDetailDto> {
  const scope = toPlanScope(session, planId);
  const plan = await loadEditablePlan(session, planId);

  // Kiểm tra Optimistic Locking
  if (plan.version !== input.expectedVersion) {
    throw new AppError(ERRORS.PLAN.CONFLICT);
  }

  const { plans } = getUserRepositories();
  const stops = await plans.listStops(scope);
  const targetIndex = stops.findIndex((s) => s.id === input.stopId);
  if (targetIndex === -1) {
    throw new AppError(ERRORS.PLAN.STOP_NOT_FOUND);
  }

  const stopUpdates: Array<{
    id: string;
    plannedTime: string;
    startMinute: number;
    dayOffset: number;
  }> = [];

  for (let i = targetIndex; i < stops.length; i++) {
    const stop = stops[i];
    // Nếu chặng sau đã ghim giờ cố định (📌) và không phải chính chặng đang click đổi giờ
    if (stop.isPinnedTime && i !== targetIndex) {
      break; // Dừng hiệu ứng dây chuyền tại chặng ghim
    }

    const currentMinute = stop.startMinute || timeStringToMinute(stop.plannedTime || "18:00");
    const newMinute = Math.max(0, currentMinute + input.shiftMinutes);
    const dayOffset = Math.floor(newMinute / 1440);
    const plannedTime = minuteToTimeString(newMinute);

    stopUpdates.push({
      id: stop.id,
      plannedTime,
      startMinute: newMinute,
      dayOffset,
    });
  }

  const success = await plans.atomicShiftSchedule(
    scope,
    input.expectedVersion,
    stopUpdates,
    toPlanTouch(session)
  );

  if (!success) {
    throw new AppError(ERRORS.PLAN.CONFLICT);
  }

  return getPlanDetail(session, planId);
}

/**
 * Tự động xếp lịch thông minh dựa trên SunCalc (giờ hoàng hôn) và khoảng cách GPS Hà Nội.
 */
export async function autoSchedulePlan(
  session: MemberSession,
  planId: string
): Promise<PlanDetailDto> {
  const scope = toPlanScope(session, planId);
  const plan = await loadEditablePlan(session, planId);
  const { plans } = getUserRepositories();
  const stops = await plans.listStops(scope);
  if (stops.length === 0) return getPlanDetail(session, planId);

  const publishedPlaces = await getAllPublishedPlaces();
  const placeMap = new Map(publishedPlaces.map((p) => [p.id, p]));

  // 1. Tính toán giờ hoàng hôn Hà Nội theo ngày hẹn
  const bestTimes = getBestTimes(21.0285, 105.8542, new Date(plan.planDate));
  const sunsetMinute = timeStringToMinute(bestTimes.sunset); // vd 17:36 = 1056 phút

  // 2. Tìm chặng săn hoàng hôn (có tag/mood sunset hoặc hoanghon)
  let sunsetStopIndex = stops.findIndex((s) => {
    if (!s.placeId) return false;
    const place = placeMap.get(s.placeId);
    if (!place) return false;
    return (
      place.moods?.includes("sunset") ||
      place.moodLabels?.some((m) => m.toLowerCase().includes("hoàng hôn") || m.toLowerCase().includes("sunset")) ||
      place.name.toLowerCase().includes("hoàng hôn") ||
      place.summary.toLowerCase().includes("hoàng hôn")
    );
  });

  // Nếu không có, mặc định chặng giữa buổi chiều là điểm hoàng hôn
  if (sunsetStopIndex === -1 && stops.length >= 2) {
    sunsetStopIndex = Math.min(stops.length - 1, 1);
  }

  // 3. Xếp thời gian các chặng
  const stopUpdates: Array<{
    id: string;
    plannedTime: string;
    startMinute: number;
    dayOffset: number;
    travelMinutes: number;
  }> = [];

  // Bắt đầu từ chặng hoàng hôn nếu có
  let baseMinute = sunsetStopIndex !== -1 ? sunsetMinute - 45 : timeStringToMinute(plan.startTime || "16:00");

  for (let i = 0; i < stops.length; i++) {
    const stop = stops[i];
    let travelMin = 15;

    if (i > 0) {
      const prevStop = stops[i - 1];
      const prevPlace = prevStop.placeId ? placeMap.get(prevStop.placeId) : null;
      const currPlace = stop.placeId ? placeMap.get(stop.placeId) : null;

      if (prevPlace && currPlace) {
        const travelResult = calculateHanoiTravelMinutes(
          { lat: Number(prevPlace.lat), lng: Number(prevPlace.lng) },
          { lat: Number(currPlace.lat), lng: Number(currPlace.lng) },
          baseMinute
        );
        travelMin = travelResult.travelMinutes;
      }
      baseMinute += (stops[i - 1].durationMin || 60) + travelMin;
    }

    const dayOffset = Math.floor(baseMinute / 1440);
    stopUpdates.push({
      id: stop.id,
      plannedTime: minuteToTimeString(baseMinute),
      startMinute: baseMinute,
      dayOffset,
      travelMinutes: travelMin,
    });
  }

  const success = await plans.atomicShiftSchedule(
    scope,
    plan.version,
    stopUpdates,
    toPlanTouch(session)
  );

  if (!success) {
    throw new AppError(ERRORS.PLAN.CONFLICT);
  }

  return getPlanDetail(session, planId);
}

/**
 * Hoán đổi Plan B (#Indoor) khi Open-Meteo báo mưa
 */
export async function applyPlanBIndoor(
  session: MemberSession,
  planId: string
): Promise<PlanDetailDto> {
  const scope = toPlanScope(session, planId);
  const plan = await loadEditablePlan(session, planId);
  const { plans } = getUserRepositories();
  const stops = await plans.listStops(scope);

  const publishedPlaces = await getAllPublishedPlaces();
  const placeMap = new Map(publishedPlaces.map((p) => [p.id, p]));

  // Lọc các địa điểm trong nhà đã xuất bản
  const indoorCandidates = publishedPlaces.filter((p) => p.indoor);
  if (indoorCandidates.length === 0) {
    return getPlanDetail(session, planId);
  }

  const stopUpdates: Array<{
    id: string;
    placeId: string;
    customName: string;
    note: string;
  }> = [];

  let candidateIdx = 0;
  for (const stop of stops) {
    if (!stop.placeId) continue;
    const currentPlace = placeMap.get(stop.placeId);
    // Nếu điểm này ngoài trời
    if (currentPlace && !currentPlace.indoor) {
      // Tìm điểm trong nhà cùng quận hoặc gần nhất
      const matchedIndoor =
        indoorCandidates.find((c) => c.area === currentPlace.area) ||
        indoorCandidates[candidateIdx % indoorCandidates.length];
      candidateIdx++;

      if (matchedIndoor && matchedIndoor.id !== stop.placeId) {
        stopUpdates.push({
          id: stop.id,
          placeId: matchedIndoor.id,
          customName: matchedIndoor.name,
          note: `[Plan B Mưa] Đổi từ ${currentPlace.name} sang ${matchedIndoor.name} (trong nhà mát mẻ).`,
        });
      }
    }
  }

  if (stopUpdates.length > 0) {
    const success = await plans.updateStopsBatch(
      scope,
      plan.version,
      stopUpdates,
      toPlanTouch(session)
    );
    if (!success) {
      throw new AppError(ERRORS.PLAN.CONFLICT);
    }
    // Plan B đổi địa điểm của trạm nên Match cũ/mới phải đổi trạng thái theo
    await getUserRepositories().swipes.syncPlannedMatches(session.roomId);
  }

  return getPlanDetail(session, planId);
}
