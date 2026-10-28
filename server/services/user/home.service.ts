import { getWeatherForecast, type WeatherData } from "@/lib/weather";
import { getBestTimes } from "@/lib/sun";
import { getAllPublishedPlaces, requirePublishedPlace } from "@/server/services/user/places.service";
import { listPlans, getPlanDetail, createPlan } from "@/server/services/user/plan.service";
import { addStop } from "@/server/services/user/plan-items.service";
import { getRoomProfile } from "@/server/services/user/room.service";
import { listMatches } from "@/server/services/user/match.service";
import { getUserRepositories } from "@/server/db/repositories";
import type { HanoiPlace } from "@/lib/types/catalog";
import type { MemberSession } from "@/server/db/repositories/types";

import type {
  HomePublicDto,
  UpcomingPlanStopPreview,
  HomeSummaryDto,
  QuickAddResultDto,
} from "@/lib/types/home";

export type {
  HomePublicDto,
  UpcomingPlanStopPreview,
  HomeSummaryDto,
  QuickAddResultDto,
};

/** Tọa độ trung tâm Hà Nội */
const HANOI_COORDS = { lat: 21.0285, lng: 105.8542 };

function formatPlanDateTime(dateStr: string, timeStr: string): string {
  try {
    const d = new Date(`${dateStr}T${timeStr}:00`);
    if (isNaN(d.getTime())) return `${dateStr} • ${timeStr}`;
    const dayOfWeek = d.getDay();
    const days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${days[dayOfWeek]}, ${dd}/${mm} • ${timeStr}`;
  } catch {
    return `${dateStr} • ${timeStr}`;
  }
}

function resolveStopIcon(title: string, category?: string): string {
  const lower = title.toLowerCase();
  if (lower.includes("cà phê") || lower.includes("cafe") || category === "cafe") return "☕";
  if (lower.includes("cầu") || lower.includes("bridge")) return "🌉";
  if (lower.includes("hoàng hôn") || lower.includes("dạo") || lower.includes("hồ")) return "🌅";
  if (lower.includes("chụp") || lower.includes("ảnh") || lower.includes("pose")) return "📸";
  if (lower.includes("ăn") || lower.includes("bún") || category === "restaurant") return "🍽️";
  return "📍";
}

/**
 * 1. GET /api/home/public?city=hanoi
 * Phục vụ toàn bộ dữ liệu công khai trên Trang chủ (Thời tiết, SunCalc, 3 thẻ gợi ý, tổng số nơi)
 */
export async function getHomePublic(city = "hanoi"): Promise<HomePublicDto> {
  const [weather, allPlaces] = await Promise.all([
    getWeatherForecast(HANOI_COORDS.lat, HANOI_COORDS.lng),
    getAllPublishedPlaces(),
  ]);

  const sunTimes = getBestTimes(HANOI_COORDS.lat, HANOI_COORDS.lng, new Date());
  const curatedPlaces = allPlaces.slice(0, 3);

  return {
    city: {
      id: city,
      name: city === "hanoi" ? "Hà Nội" : city,
      totalPlaces: allPlaces.length,
    },
    weather,
    sun: {
      goldenHour: {
        start: sunTimes.goldenHourEvening.start,
        end: sunTimes.goldenHourEvening.end,
      },
      blueHour: {
        start: sunTimes.blueHour.start,
        end: sunTimes.blueHour.end,
      },
      sunrise: sunTimes.sunrise,
      sunset: sunTimes.sunset,
    },
    weatherTip: weather.weatherTip,
    curatedPlaces,
  };
}

/**
 * 2. GET /api/home/summary
 * Phục vụ dữ liệu cá nhân hóa của cặp đôi (Phòng đôi, buổi hẹn sắp tới, badges)
 */
export async function getHomeSummary(session: MemberSession | null): Promise<HomeSummaryDto> {
  if (!session) {
    return {
      room: null,
      upcomingPlan: null,
      badges: {
        matchCount: 0,
        hasUpcomingPlan: false,
        savedCount: 0,
        savedPlaceIds: [],
      },
    };
  }

  const [profile, plans, matches, savedPlaceIds] = await Promise.all([
    getRoomProfile(session),
    listPlans(session),
    listMatches(session),
    getUserRepositories().saved.listPlaceIds(session.memberId),
  ]);

  // Xác định tên phòng hiển thị
  const memberNicknames = profile.members.map((m) => m.nickname).filter(Boolean);
  const roomName =
    profile.room.name ||
    (memberNicknames.length > 0 ? memberNicknames.join(" & ") : "Cặp đôi DateMate");

  // Đếm ngược ngày kỷ niệm
  let anniversaryInfo: NonNullable<HomeSummaryDto["room"]>["anniversary"] = null;
  if (profile.room.anniversaryDate) {
    try {
      const anniv = new Date(profile.room.anniversaryDate);
      const today = new Date();
      // Tính ngày kế tiếp của dịp kỷ niệm
      const nextAnniv = new Date(today.getFullYear(), anniv.getMonth(), anniv.getDate());
      if (nextAnniv < today) {
        nextAnniv.setFullYear(today.getFullYear() + 1);
      }
      const diffTime = nextAnniv.getTime() - today.getTime();
      const daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      anniversaryInfo = {
        title: "Kỷ niệm tình yêu",
        date: profile.room.anniversaryDate,
        daysLeft,
      };
    } catch {
      anniversaryInfo = null;
    }
  } else {
    // Giá trị mẫu thân thiện nếu chưa đặt ngày
    anniversaryInfo = {
      title: "Kỷ niệm 1 năm",
      date: null,
      daysLeft: 12,
    };
  }

  // Tìm buổi hẹn sắp tới gần nhất (chưa hủy, ngày >= hôm nay)
  const todayStr = new Date().toISOString().slice(0, 10);
  const validPlans = plans
    .filter((p) => p.status !== "cancelled" && p.planDate >= todayStr)
    .sort((a, b) => a.planDate.localeCompare(b.planDate) || a.startTime.localeCompare(b.startTime));

  const upcoming = validPlans[0] ?? plans[0] ?? null;
  let upcomingPlanDto: HomeSummaryDto["upcomingPlan"] = null;

  if (upcoming) {
    const detail = await getPlanDetail(session, upcoming.id);
    const stopsPreview: UpcomingPlanStopPreview[] = detail.stops.slice(0, 3).map((s) => {
      const time = s.plannedTime || upcoming.startTime;
      const title = s.customName || "Điểm hẹn hò";
      const icon = resolveStopIcon(title);
      return { id: s.id, time, title, icon };
    });

    const completedChecklist = detail.checklist.filter((c) => c.isDone).length;
    const totalChecklist = detail.checklist.length;

    upcomingPlanDto = {
      id: upcoming.id,
      title: upcoming.title,
      formattedDate: formatPlanDateTime(upcoming.planDate, upcoming.startTime),
      planDate: upcoming.planDate,
      startTime: upcoming.startTime,
      stops: stopsPreview,
      checklist: {
        total: totalChecklist,
        completed: completedChecklist,
        summaryText: `${completedChecklist}/${totalChecklist} xong`,
      },
      icsUrl: `/api/v1/user/plans/${upcoming.id}/export.ics`,
    };
  }

  const openMatchesCount = matches.filter((m) => m.status === "open").length;

  return {
    room: {
      id: profile.room.id,
      name: roomName,
      isPaired: profile.room.memberCount >= 2,
      memberCount: profile.room.memberCount,
      anniversary: anniversaryInfo,
    },
    upcomingPlan: upcomingPlanDto,
    badges: {
      matchCount: openMatchesCount,
      hasUpcomingPlan: upcomingPlanDto !== null,
      savedCount: savedPlaceIds.length,
      savedPlaceIds,
    },
  };
}

/**
 * 10. POST /api/plans/quick-add
 * Bấm "+ Vào lịch" trên thẻ địa điểm: thêm ngay trạm vào kế hoạch sắp tới hoặc tạo mới
 */
export async function quickAddStopToPlan(
  session: MemberSession,
  placeId: string
): Promise<QuickAddResultDto> {
  const place = await requirePublishedPlace(placeId);
  const plans = await listPlans(session);

  const todayStr = new Date().toISOString().slice(0, 10);
  const activePlan = plans
    .filter((p) => p.status !== "cancelled" && p.planDate >= todayStr)
    .sort((a, b) => a.planDate.localeCompare(b.planDate) || a.startTime.localeCompare(b.startTime))[0];

  if (activePlan) {
    await addStop(session, activePlan.id, {
      placeId: place.id,
      customName: place.name,
      plannedTime: activePlan.startTime,
    });
    return {
      success: true,
      planId: activePlan.id,
      planTitle: activePlan.title,
      placeName: place.name,
    };
  }

  // Nếu chưa có kế hoạch nào, tự động tạo mới cho cuối tuần tới
  const nextSunday = new Date();
  const daysUntilSunday = (7 - nextSunday.getDay()) % 7 || 7;
  nextSunday.setDate(nextSunday.getDate() + daysUntilSunday);
  const planDateStr = nextSunday.toISOString().slice(0, 10);

  const newPlan = await createPlan(session, {
    title: `Buổi hẹn cuối tuần tại ${place.name}`,
    planDate: planDateStr,
    startTime: "16:30",
    placeId: place.id,
  });

  return {
    success: true,
    planId: newPlan.id,
    planTitle: newPlan.title,
    placeName: place.name,
  };
}
