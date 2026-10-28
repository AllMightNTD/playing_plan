import {
  cleanSearchTokens,
  extractDistricts,
  isGenericSingleWord,
  removeVietnameseTones,
} from "./text-matcher";

export interface PlaceForMatching {
  id: string;
  name: string;
  address?: string;
  district?: string;
}

export interface VideoForMatching {
  videoId: string;
  title: string;
  description: string;
  channelId?: string;
  channelTitle?: string;
  publishedAt?: string;
}

export interface MatchScoreResult {
  placeId: string;
  videoId: string;
  score: number;
  status: "auto_linked" | "pending_review" | "rejected";
  breakdown: {
    nameMatchScore: number;
    geoContextScore: number;
    specificityScore: number;
  };
  matchedDistricts: string[];
}

/**
 * Tính điểm tương đồng ngữ cảnh giữa một Video YouTube và một Địa điểm (Pairwise Matcher).
 */
export function calculatePlaceVideoMatch(
  place: PlaceForMatching,
  video: VideoForMatching
): MatchScoreResult {
  const combinedVideoText = `${video.title} ${video.description}`;
  const videoNorm = removeVietnameseTones(combinedVideoText);
  const titleNorm = removeVietnameseTones(video.title);

  const placeTokens = cleanSearchTokens(place.name);
  const placeNormName = placeTokens.join(" ");

  let nameMatchScore = 0;
  let geoContextScore = 0;
  let specificityScore = 0;

  // 1. Tên quán khớp chuẩn hóa (+50)
  if (placeNormName.length > 0) {
    if (titleNorm.includes(placeNormName)) {
      // Khớp chuẩn xác chuỗi trong tiêu đề
      nameMatchScore = 50;
    } else if (videoNorm.includes(placeNormName)) {
      // Khớp trong mô tả
      nameMatchScore = 45;
    } else {
      // Fuzzy / token match: Kiểm tra tỷ lệ token xuất hiện
      const matchedTokens = placeTokens.filter((token) => videoNorm.includes(token));
      const ratio = placeTokens.length > 0 ? matchedTokens.length / placeTokens.length : 0;
      if (ratio >= 0.8) {
        nameMatchScore = 40;
      } else if (ratio >= 0.5) {
        nameMatchScore = 20;
      }
    }
  }

  // 2. Ngữ cảnh địa lý: Quận / Phố (+30)
  const videoDistricts = extractDistricts(combinedVideoText);
  const placeAddressNorm = removeVietnameseTones(`${place.address || ""} ${place.district || ""}`);

  let hasGeoMatch = false;
  for (const d of videoDistricts) {
    // Kiểm tra xem địa chỉ quán có chứa quận này không
    const dKeywords = extractDistricts(placeAddressNorm);
    if (dKeywords.includes(d)) {
      hasGeoMatch = true;
      break;
    }
  }

  // Ngoài ra kiểm tra tên đường/phố cụ thể trong địa chỉ quán có xuất hiện trong video không
  if (!hasGeoMatch && place.address) {
    const addressTokens = cleanSearchTokens(place.address);
    // Lấy cụm từ 2 từ liên tiếp trong địa chỉ kiểm tra trong video (ví dụ: "yên phụ", "nguyễn hữu huân")
    for (let i = 0; i < addressTokens.length - 1; i++) {
      const phrase = `${addressTokens[i]} ${addressTokens[i + 1]}`;
      if (videoNorm.includes(phrase)) {
        hasGeoMatch = true;
        break;
      }
    }
  }

  if (hasGeoMatch) {
    geoContextScore = 30;
  }

  // 3. Tên quán có tính đặc thù (+20)
  if (!isGenericSingleWord(place.name) && placeTokens.length >= 2) {
    specificityScore = 20;
  }

  const totalScore = nameMatchScore + geoContextScore + specificityScore;

  let status: MatchScoreResult["status"] = "rejected";
  if (totalScore >= 80 && nameMatchScore >= 40) {
    status = "auto_linked";
  } else if (totalScore >= 50 && nameMatchScore >= 20) {
    status = "pending_review";
  }

  return {
    placeId: place.id,
    videoId: video.videoId,
    score: totalScore,
    status,
    breakdown: {
      nameMatchScore,
      geoContextScore,
      specificityScore,
    },
    matchedDistricts: videoDistricts,
  };
}

/**
 * So khớp một danh sách video với một danh sách địa điểm (M:N Disambiguation Matching).
 */
export function matchVideosWithPlaces(
  places: PlaceForMatching[],
  videos: VideoForMatching[]
): MatchScoreResult[] {
  const matches: MatchScoreResult[] = [];

  for (const video of videos) {
    for (const place of places) {
      const match = calculatePlaceVideoMatch(place, video);
      if (match.status !== "rejected") {
        matches.push(match);
      }
    }
  }

  return matches;
}
