import type { PlaceCategory } from "@/lib/constants/catalog";

export interface PhotoSpot {
  name: string;
  howToFind: string;
  tip: string;
}

export interface Pose {
  title: string;
  desc: string;
}

export interface OutfitGuide {
  palette: string[];
  tonSurTon: string;
  contrast: string;
  avoid: string;
  weatherTip: string;
}

export interface BestTimeSlot {
  label: string;
  start: string;
  end: string;
  type: "golden" | "blue" | "quiet";
  note?: string;
}

export interface SeasonNote {
  months: number[];
  note: string;
}

export interface PlaceMediaItem {
  id: string;
  type: "image" | "video";
  platform: "unsplash" | "wikimedia" | "youtube" | "tiktok" | "upload" | "pexels" | "instagram";
  url: string;
  embedId?: string | null;
  caption?: string | null;
  credit?: string | null;
  sourceUrl?: string | null;
  licenseNote?: string | null;
  license: "own" | "cc0" | "licensed" | "permission" | "embed_only";
  sortOrder: number;
}

/**
 * DTO địa điểm dùng chung cho FE và BE (catalog đã xuất bản).
 */
export interface HanoiPlace {
  id: string;
  slug: string;
  name: string;
  area: string;
  category: PlaceCategory;
  categoryLabel: string;
  priceLevel: number;
  costText: string;
  moods: string[];
  moodLabels: string[];
  indoor: boolean;
  status: "published" | "hidden";
  lat?: number;
  lng?: number;
  bestTimeText: string;
  goldenMorning: string;
  goldenAfternoon: string;
  blueHour: string;
  bestWeekdays: string;
  avoidWeekdays: string;
  summary: string;
  coverGradient: string;
  coverUrl?: string;
  emoji: string;
  media: PlaceMediaItem[];
  photoSpots: PhotoSpot[];
  poses: Pose[];
  outfit: OutfitGuide;
  tips: string;
  nearbyIds: string[];
}

