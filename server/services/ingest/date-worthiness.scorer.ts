import { PlaceBlocklist } from "@/server/db/schema/governance";
import { assertNotBlocklisted } from "@/server/services/admin/governance.policy";

export interface OsmPlaceCandidateInput {
  osmId: string;
  name: string;
  lat: number;
  lng: number;
  category: string;
  tags: Record<string, string>;
  address?: string;
}

export interface DateWorthinessScoreResult {
  score: number;
  breakdown: {
    categoryScore: number;
    contactSignalsScore: number;
    romanticAmenitiesScore: number;
    structuredHoursScore: number;
    penaltyScore: number;
  };
  isBlocklisted: boolean;
  passesThreshold: boolean;
  blocklistReason?: string;
}

const ROMANTIC_CATEGORIES = new Set([
  "cafe",
  "restaurant",
  "viewpoint",
  "park",
  "museum",
  "gallery",
  "bar",
  "pub",
  "ice_cream",
  "cinema",
  "theatre",
  "arts_centre",
  "theme_park",
  "zoo",
  "attraction",
  "aquarium",
  "picnic_site",
  "garden",
  "bowling_alley",
  "bakery",
  "pastry",
  "tea",
  "craft",
]);

const STREET_CART_JUNK_KEYWORDS = [
  "trà đá",
  "tra da",
  "quán nước",
  "quan nuoc",
  "cơm bình dân",
  "com binh dan",
  "tạp hóa",
  "tap hoa",
  "tạp hoá",
  "sửa xe",
  "rửa xe",
  "cháo lòng",
  "chao long",
  "vỉa hè",
  "via he",
  "bắn cá",
];

/**
 * Động cơ chấm điểm tiềm năng hẹn hò (Weighted Date-worthiness Heuristic Engine).
 * Sàng lọc địa điểm thô từ OSM trước khi ghi vào candidate_places.
 */
export function scoreDateWorthiness(
  candidate: OsmPlaceCandidateInput,
  blocklist: PlaceBlocklist[] = []
): DateWorthinessScoreResult {
  // 1. Kiểm tra danh sách cấm (Blocklist Guard)
  try {
    assertNotBlocklisted(
      {
        osmId: candidate.osmId,
        name: candidate.name,
        lat: candidate.lat,
        lng: candidate.lng,
      },
      blocklist
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Blocklisted place";
    return {
      score: 0,
      breakdown: {
        categoryScore: 0,
        contactSignalsScore: 0,
        romanticAmenitiesScore: 0,
        structuredHoursScore: 0,
        penaltyScore: -100,
      },
      isBlocklisted: true,
      passesThreshold: false,
      blocklistReason: errorMsg,
    };
  }

  const tags = candidate.tags || {};
  const normalizedName = (candidate.name || "").toLowerCase().trim();

  let categoryScore = 0;
  let contactSignalsScore = 0;
  let romanticAmenitiesScore = 0;
  let structuredHoursScore = 0;
  let penaltyScore = 0;

  // 2. Thể loại hẹn hò (+25)
  const cat = (candidate.category || tags.amenity || tags.tourism || tags.leisure || "").toLowerCase();
  if (ROMANTIC_CATEGORIES.has(cat)) {
    categoryScore = 25;
  }

  // 3. Tín hiệu thực tế: website, facebook, phone, instagram (+20)
  const hasContact = Boolean(
    tags.website ||
    tags["contact:website"] ||
    tags["contact:facebook"] ||
    tags["contact:instagram"] ||
    tags.phone ||
    tags["contact:phone"]
  );
  if (hasContact) {
    contactSignalsScore = 20;
  }

  // 4. Tiện ích lãng mạn: outdoor_seating, view hồ/sông, rooftop (+25)
  const hasOutdoor = tags.outdoor_seating === "yes";
  const hasWaterView =
    tags.view === "lake" ||
    tags.view === "river" ||
    tags.view === "water" ||
    normalizedName.includes("hồ tây") ||
    normalizedName.includes("ho tay") ||
    normalizedName.includes("hồ gươm") ||
    normalizedName.includes("ven hồ");
  const hasRooftop =
    tags.rooftop === "yes" ||
    tags.level === "rooftop" ||
    normalizedName.includes("rooftop") ||
    normalizedName.includes("tầng thượng");

  if (hasOutdoor || hasWaterView || hasRooftop) {
    romanticAmenitiesScore = 25;
  }

  // 5. Giờ mở cửa có cấu trúc (+10)
  if (tags.opening_hours && tags.opening_hours.trim().length > 3) {
    structuredHoursScore = 10;
  }

  // 6. Tiêu chí trừ điểm (-40)
  // Tên quá ngắn (< 3 ký tự) hoặc chứa từ khóa quán cóc/vỉa hè/cơm bình dân
  if (normalizedName.length < 3) {
    penaltyScore -= 40;
  } else {
    for (const kw of STREET_CART_JUNK_KEYWORDS) {
      if (normalizedName.includes(kw)) {
        penaltyScore -= 40;
        break;
      }
    }
  }

  // Tổng điểm trong thang [0, 100]
  const rawScore =
    categoryScore +
    contactSignalsScore +
    romanticAmenitiesScore +
    structuredHoursScore +
    penaltyScore;

  const finalScore = Math.max(0, Math.min(100, rawScore));
  const passesThreshold = finalScore >= 40;

  return {
    score: finalScore,
    breakdown: {
      categoryScore,
      contactSignalsScore,
      romanticAmenitiesScore,
      structuredHoursScore,
      penaltyScore,
    },
    isBlocklisted: false,
    passesThreshold,
  };
}
