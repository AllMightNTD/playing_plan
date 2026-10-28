import type { Place, PlaceGuide } from "@/server/db/schema";

/** `category` là cột NOT NULL kiểu enum nên DB đã đảm bảo, không cần kiểm lại ở đây. */
type PublishCheckPlace = Pick<Place, "coverUrl" | "lat" | "lng" | "moods">;
type PublishCheckGuide = Pick<PlaceGuide, "bestTimes" | "photoSpots" | "poses" | "outfit" | "tips" | "crowdNotes">;

function hasGuideContent(guide: PublishCheckGuide | null): boolean {
  if (!guide) return false;
  return Boolean(
    guide.bestTimes?.length ||
      guide.photoSpots?.length ||
      guide.poses?.length ||
      guide.outfit?.palette.length ||
      guide.tips?.trim() ||
      guide.crowdNotes?.trim()
  );
}

/**
 * F16: trước khi xuất bản phải có ảnh bìa, tọa độ, ít nhất 1 mood và 1 mục cẩm nang.
 * Trả về map `field → mã lỗi`; rỗng nghĩa là đủ điều kiện.
 */
export function collectPublishIssues(place: PublishCheckPlace, guide: PublishCheckGuide | null): Record<string, string> {
  const issues: Record<string, string> = {};
  if (!place.coverUrl.trim()) issues.coverUrl = "COVER_REQUIRED";
  if (Number(place.lat) === 0 && Number(place.lng) === 0) issues.lat = "COORDINATES_REQUIRED";
  if (place.moods.length === 0) issues.moods = "MOOD_REQUIRED";
  if (!hasGuideContent(guide)) issues.guide = "GUIDE_REQUIRED";
  return issues;
}
