import type { WeatherData } from "@/lib/weather";
import type { HanoiPlace } from "@/lib/types/catalog";

export interface HomePublicDto {
  city: {
    id: string;
    name: string;
    totalPlaces: number;
  };
  weather: WeatherData;
  sun: {
    goldenHour: { start: string; end: string };
    blueHour: { start: string; end: string };
    sunrise: string;
    sunset: string;
  };
  weatherTip: string;
  curatedPlaces: HanoiPlace[];
}

export interface UpcomingPlanStopPreview {
  id: string;
  time: string;
  title: string;
  icon: string;
}

export interface HomeSummaryDto {
  room: {
    id: string;
    name: string;
    isPaired: boolean;
    memberCount: number;
    anniversary: {
      title: string;
      date: string | null;
      daysLeft: number | null;
    } | null;
  } | null;
  upcomingPlan: {
    id: string;
    title: string;
    formattedDate: string;
    planDate: string;
    startTime: string;
    stops: UpcomingPlanStopPreview[];
    checklist: {
      total: number;
      completed: number;
      summaryText: string;
    };
    icsUrl: string;
  } | null;
  badges: {
    matchCount: number;
    hasUpcomingPlan: boolean;
    savedCount: number;
    savedPlaceIds: string[];
  };
}

export interface QuickAddResultDto {
  success: boolean;
  planId: string;
  planTitle: string;
  placeName: string;
}
