import { CATEGORY_LABELS, CATEGORY_VISUALS, MOOD_LABELS, WEEKDAY_LABELS, type MoodKey } from "@/lib/constants/catalog";
import { getBestTimes } from "@/lib/sun";
import type { Place, PlaceGuide, PlaceMedia } from "@/server/db/schema";
import type { HanoiPlace, OutfitGuide, PlaceMediaItem } from "@/lib/types/catalog";

const EMPTY_OUTFIT: OutfitGuide = { palette: [], tonSurTon: "", contrast: "", avoid: "", weatherTip: "" };
const VND_PER_THOUSAND = 1000;

export function formatCostRange(min: number, max: number): string {
  if (max <= 0) return "Miễn phí";
  return `${min / VND_PER_THOUSAND}k - ${max / VND_PER_THOUSAND}k`;
}

function formatWeekdays(days: number[] | null | undefined, fallback: string): string {
  const labels = (days ?? []).map((day) => WEEKDAY_LABELS[day]).filter(Boolean);
  return labels.length > 0 ? labels.join(", ") : fallback;
}

/** F13: địa điểm có khung giờ nhập tay (trong nhà, phố đêm) ưu tiên giờ admin nhập thay vì giờ mặt trời. */
function toBestTimeText(guide: PlaceGuide | null, sunsetWindow: string): string {
  const manualSlot = guide?.bestTimes?.[0];
  if (manualSlot) return `Hợp đi lúc ${manualSlot.start} - ${manualSlot.end} nha`;
  return `Hợp đi lúc ${sunsetWindow} nha`;
}

export function toPlaceMediaItem(media: PlaceMedia): PlaceMediaItem {
  let credit = media.credit ?? null;
  if (media.platform === "unsplash" && credit && !credit.includes("Unsplash")) {
    credit = `${credit} / Unsplash`;
  }
  return {
    id: media.id,
    type: media.type,
    platform: media.platform,
    url: media.url,
    embedId: media.embedId,
    caption: media.caption,
    credit,
    sourceUrl: media.sourceUrl,
    licenseNote: media.licenseNote,
    license: media.license,
    sortOrder: media.sortOrder,
  };
}

/**
 * Chuyển bản ghi DB (places + place_guides + place_media) sang DTO catalog dùng chung FE/BE.
 */
export function toCatalogPlace(
  place: Place,
  guide: PlaceGuide | null,
  mediaList: PlaceMedia[] = [],
  date: Date = new Date()
): HanoiPlace {
  const lat = Number(place.lat);
  const lng = Number(place.lng);
  const sun = getBestTimes(lat, lng, date);
  const visual = CATEGORY_VISUALS[place.category];
  const sunsetWindow = `${sun.goldenHourEvening.start} - ${sun.goldenHourEvening.end}`;
  const mappedMedia = mediaList.map(toPlaceMediaItem);
  const coverUrl = place.coverUrl || mappedMedia[0]?.url || undefined;

  return {
    id: place.id,
    slug: place.slug,
    name: place.name,
    area: place.area,
    address: place.address,
    category: place.category,
    categoryLabel: CATEGORY_LABELS[place.category],
    priceLevel: place.priceLevel,
    costText: formatCostRange(place.estCostMin, place.estCostMax),
    moods: place.moods,
    moodLabels: place.moods.map((mood) => MOOD_LABELS[mood as MoodKey] ?? mood),
    indoor: place.indoor,
    status: "published",
    lat,
    lng,
    bestTimeText: toBestTimeText(guide, sunsetWindow),
    goldenMorning: `${sun.goldenHourMorning.start} - ${sun.goldenHourMorning.end}`,
    goldenAfternoon: sunsetWindow,
    blueHour: `${sun.blueHour.start} - ${sun.blueHour.end}`,
    bestWeekdays: formatWeekdays(guide?.bestWeekdays, "Ngày nào cũng hợp"),
    avoidWeekdays: formatWeekdays(guide?.avoidWeekdays, "Không có"),
    summary: place.summary,
    coverGradient: visual.coverGradient,
    coverUrl,
    emoji: visual.emoji,
    media: mappedMedia,
    photoSpots: guide?.photoSpots ?? [],
    poses: guide?.poses ?? [],
    outfit: guide?.outfit ?? EMPTY_OUTFIT,
    tips: guide?.tips ?? "",
    nearbyIds: [],
    tier: place.tier,
    batchId: place.batchId,
    dateFit: place.dateFit,
    displayName: place.displayName,
    isAutoPromoted: Boolean(place.batchId || place.tier === "B"),
  };
}

