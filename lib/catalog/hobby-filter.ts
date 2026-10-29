import type { HanoiPlace } from "@/lib/types/catalog";

export type HobbyTagId =
  | "sunset"
  | "photo"
  | "indoor"
  | "cafe"
  | "art"
  | "quiet"
  | "budget"
  | "active";

export interface HobbyTag {
  id: HobbyTagId;
  label: string;
  emoji: string;
  description: string;
}

export const HOBBY_TAGS: HobbyTag[] = [
  { id: "sunset", label: "Săn hoàng hôn", emoji: "🌅", description: "View ngắm hoàng hôn lãng mạn" },
  { id: "photo", label: "Chụp ảnh thơ mộng", emoji: "📸", description: "Góc sống ảo xinh xắn" },
  { id: "indoor", label: "Indoor mát mẻ", emoji: "❄️", description: "Không gian máy lạnh, tránh mưa nắng" },
  { id: "cafe", label: "Cà phê view đẹp", emoji: "☕", description: "Quán cà phê chill hẹn hò" },
  { id: "art", label: "Nghệ thuật & Workshop", emoji: "🎨", description: "Triển lãm, làm đồ thủ công" },
  { id: "quiet", label: "Yên tĩnh tâm sự", emoji: "🤫", description: "Không gian riêng tư, lãng mạn" },
  { id: "budget", label: "Hạt dẻ (<100k)", emoji: "💸", description: "Chi phí tiết kiệm, bình dân" },
  { id: "active", label: "Vận động vui nhộn", emoji: "🎳", description: "Hoạt động vui chơi, trải nghiệm" },
];

/**
 * Ánh xạ ảo 8 Hobby Tags vào trường dữ liệu hiện có của HanoiPlace (Master Plan 5.4).
 */
export function matchesHobby(place: HanoiPlace, hobby: HobbyTagId): boolean {
  const nameLower = place.name.toLowerCase();
  const summaryLower = (place.summary || "").toLowerCase();
  const moods = place.moods || [];

  switch (hobby) {
    case "sunset":
      return moods.includes("sunset") || nameLower.includes("hoàng hôn") || summaryLower.includes("hoàng hôn");

    case "photo":
      return place.category === "photo" || moods.includes("photo") || summaryLower.includes("chụp ảnh") || nameLower.includes("studio");

    case "indoor":
      return place.indoor === true || place.category === "indoor";

    case "cafe":
      return place.category === "cafe" || moods.includes("cafe") || nameLower.includes("cafe") || nameLower.includes("cà phê");

    case "art":
      return (
        moods.includes("art") ||
        summaryLower.includes("workshop") ||
        summaryLower.includes("triển lãm") ||
        summaryLower.includes("bảo tàng") ||
        nameLower.includes("art")
      );

    case "quiet":
      return place.dateFit === "romantic" || moods.includes("chill") || moods.includes("quiet") || summaryLower.includes("yên tĩnh");

    case "budget":
      return (
        place.priceLevel === 1 ||
        place.costText.includes("< 100") ||
        place.costText.includes("miễn phí") ||
        place.costText.includes("0đ") ||
        place.costText.includes("bình dân")
      );

    case "active":
      return (
        place.category === "fun" ||
        moods.includes("fun") ||
        moods.includes("active") ||
        summaryLower.includes("vận động") ||
        summaryLower.includes("trải nghiệm")
      );

    default:
      return true;
  }
}

/**
 * Lọc danh sách địa điểm theo hobby tag.
 */
export function filterPlacesByHobby(places: HanoiPlace[], hobby?: string): HanoiPlace[] {
  if (!hobby) return places;
  const validHobby = HOBBY_TAGS.find((h) => h.id === hobby)?.id;
  if (!validHobby) return places;
  return places.filter((p) => matchesHobby(p, validHobby));
}
