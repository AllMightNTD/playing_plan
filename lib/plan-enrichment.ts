import { CATEGORY_VISUALS, type PlaceCategory } from "@/lib/constants/catalog";
import { normalizeVietnamese, toSlug } from "@/lib/search";
import type { HanoiPlace } from "@/lib/types/catalog";
import type { PlanStopDto } from "@/server/services/user/plan.mapper";

export interface PlaceCategoryMeta {
  category: PlaceCategory | "sunset" | "custom";
  icon: string;
  label: string;
}

const STANDARD_CATEGORY_LABELS: Record<PlaceCategory, string> = {
  cafe: "Cà phê",
  food: "Ăn uống",
  photo: "Chụp ảnh / Check-in",
  walk: "Dạo phố",
  fun: "Vui chơi / Giải trí",
  indoor: "Trong nhà",
  nature: "Thiên nhiên / Công viên",
};

const LEGACY_CATEGORY_META: Record<string, PlaceCategoryMeta> = {
  coffee: { category: "cafe", icon: CATEGORY_VISUALS.cafe.emoji, label: STANDARD_CATEGORY_LABELS.cafe },
  activity: { category: "photo", icon: CATEGORY_VISUALS.photo.emoji, label: STANDARD_CATEGORY_LABELS.photo },
  sunset: { category: "sunset", icon: "🌅", label: "Ngắm hoàng hôn" },
};

const FALLBACK_CATEGORY_META: PlaceCategoryMeta = {
  category: "custom",
  icon: "📍",
  label: "Địa điểm hẹn hò",
};

/**
 * Resolves display icon and Vietnamese label for any DB PlaceCategory or legacy UI alias.
 */
export function getPlaceCategoryMeta(rawCategory?: string | null): PlaceCategoryMeta {
  if (!rawCategory) return FALLBACK_CATEGORY_META;
  const normalized = rawCategory.trim().toLowerCase();

  if (normalized in CATEGORY_VISUALS) {
    const key = normalized as PlaceCategory;
    return {
      category: key,
      icon: CATEGORY_VISUALS[key].emoji,
      label: STANDARD_CATEGORY_LABELS[key],
    };
  }

  return LEGACY_CATEGORY_META[normalized] ?? FALLBACK_CATEGORY_META;
}

export interface EnrichedPlanStop extends PlanStopDto {
  name: string;
  placeSlug: string | null;
  coverUrl: string | null;
  category: string;
  categoryLabel: string;
  icon: string;
  address: string;
  isIndoor: boolean;
  planBNote: string;
  note: string;
  lat: number | null;
  lng: number | null;
  duration: number;
  isLocked: boolean;
  lockedStartTime: string | null;
}

const PLAN_B_TAG = "[Plan B Mưa]";

function splitPlanBNote(rawNote: string | null): { displayNote: string; planBNote: string } {
  if (!rawNote) return { displayNote: "", planBNote: "" };
  if (!rawNote.includes(PLAN_B_TAG)) return { displayNote: rawNote, planBNote: "" };

  const lines = rawNote.split("\n");
  const planBLine = lines.find((line) => line.includes(PLAN_B_TAG)) ?? "";
  const displayNote = lines
    .filter((line) => !line.includes(PLAN_B_TAG))
    .join("\n")
    .trim();

  return { displayNote, planBNote: planBLine };
}

/**
 * Pure mapper combining plan stops with catalog places for timeline rendering & distance math.
 */
export function enrichPlanStops(
  stops: PlanStopDto[],
  places: HanoiPlace[] = []
): EnrichedPlanStop[] {
  const placeById = new Map<string, HanoiPlace>();
  for (const place of places) {
    placeById.set(place.id, place);
  }

  return stops.map((stop) => {
    const place = stop.placeId ? placeById.get(stop.placeId) : undefined;
    const meta = getPlaceCategoryMeta(place?.category);
    const { displayNote, planBNote } = splitPlanBNote(stop.note);

    return {
      ...stop,
      name: stop.customName || place?.name || "Địa điểm hẹn hò",
      placeSlug: place?.slug ?? null,
      coverUrl: place?.coverUrl ?? null,
      category: meta.category,
      categoryLabel: meta.label,
      icon: meta.icon,
      address: place?.address || place?.area || "Hà Nội",
      isIndoor: place?.indoor ?? true,
      planBNote,
      note: displayNote,
      lat: place?.lat ?? null,
      lng: place?.lng ?? null,
      duration: stop.durationMin,
      isLocked: stop.isPinnedTime,
      lockedStartTime: stop.plannedTime,
    };
  });
}

/**
 * Finds a published catalog place matching a display name (accent/case-insensitive or slug match).
 */
export function matchCatalogPlaceByName(
  candidateName: string,
  places: HanoiPlace[] = []
): HanoiPlace | null {
  const targetNorm = normalizeVietnamese(candidateName);
  const targetSlug = toSlug(candidateName);
  if (!targetNorm) return null;

  for (const place of places) {
    if (place.slug === targetSlug || normalizeVietnamese(place.name) === targetNorm) {
      return place;
    }
  }

  for (const place of places) {
    const placeNorm = normalizeVietnamese(place.name);
    if (placeNorm.length >= 4 && (placeNorm.includes(targetNorm) || targetNorm.includes(placeNorm))) {
      return place;
    }
  }

  return null;
}

export interface DatingTemplateStop {
  name: string;
  category: "cafe" | "photo" | "sunset" | "food";
  duration: number;
  isLocked?: boolean;
  lockedStartTime?: string | null;
  note?: string;
  address?: string;
}

export interface DatingTemplate {
  id: string;
  title: string;
  tagline: string;
  icon: string;
  estimatedDuration: string;
  badge: string;
  stops: DatingTemplateStop[];
}

export const DATING_TEMPLATES: DatingTemplate[] = [
  {
    id: "chill-cafe",
    title: "Chill Cafe Cuối Tuần",
    tagline: "Trò chuyện ấm cúng, check-in tranh cổ & cafe chiều phố cổ",
    icon: "☕",
    estimatedDuration: "3h 15p • 3 điểm",
    badge: "Phổ biến nhất",
    stops: [
      {
        name: "420 Lab",
        category: "cafe",
        duration: 60,
        note: "Mở đầu buổi hẹn nhẹ nhàng, thử dòng Coldbrew đặc trưng",
        address: "Ba Đình, Hà Nội",
      },
      {
        name: "Bảo Tàng Mỹ Thuật Việt Nam",
        category: "photo",
        duration: 75,
        isLocked: true,
        lockedStartTime: "16:15",
        note: "Chụp ảnh cầu thang vintage tầng 2 và ngắm tranh chiều",
        address: "Ba Đình, Hà Nội",
      },
      {
        name: "Cà Phê Blackbird",
        category: "cafe",
        duration: 60,
        note: "Ngồi góc nhỏ tâm sự buổi tối ấm cúng",
        address: "Hoàn Kiếm, Hà Nội",
      },
    ],
  },
  {
    id: "hoang-hon-ho-tay",
    title: "Hẹn Hò Hoàng Hôn Hồ Tây",
    tagline: "Săn khung giờ vàng lãng mạn ven hồ & thưởng thức ẩm thực",
    icon: "🌅",
    estimatedDuration: "3h 05p • 3 điểm",
    badge: "Lãng mạn",
    stops: [
      {
        name: "Là Việt Coffee",
        category: "cafe",
        duration: 60,
        note: "Cà phê thơm dịu, trò chuyện chuẩn bị ngắm hoàng hôn",
        address: "Đống Đa, Hà Nội",
      },
      {
        name: "Hồ Tây - Phố Từ Hoa",
        category: "sunset",
        duration: 60,
        isLocked: true,
        lockedStartTime: "16:20",
        note: "Dạo bộ ven hồ đón Giờ Vàng, nhớ mang máy ảnh film",
        address: "Tây Hồ, Hà Nội",
      },
      {
        name: "Bún Chả Nem Phố Cổ",
        category: "food",
        duration: 60,
        note: "Ăn tối nạp năng lượng sau khi săn hoàng hôn",
        address: "Hoàn Kiếm, Hà Nội",
      },
    ],
  },
  {
    id: "foodtour-pho-co",
    title: "Foodtour Hà Nội & Dạo Phố",
    tagline: "Ăn no nê đặc sản phố cổ, dạo mát hồ Gươm & cà phê chill",
    icon: "🍜",
    estimatedDuration: "3h 00p • 3 điểm",
    badge: "Vui vẻ năng động",
    stops: [
      {
        name: "Bún Chả Nem Phố Cổ",
        category: "food",
        duration: 60,
        note: "Thưởng thức bún chả que tre thơm nức phố cổ",
        address: "Hoàn Kiếm, Hà Nội",
      },
      {
        name: "Phố Đi Bộ & Kem Tràng Tiền",
        category: "photo",
        duration: 60,
        note: "Dạo mát quanh hồ Gươm, thưởng thức kem cốm truyền thống",
        address: "Hoàn Kiếm, Hà Nội",
      },
      {
        name: "Cà Phê Blackbird",
        category: "cafe",
        duration: 60,
        note: "Ngồi ban công ngắm dòng người qua lại về đêm",
        address: "Hoàn Kiếm, Hà Nội",
      },
    ],
  },
];

