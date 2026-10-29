import { isDatabaseConfigured } from "@/server/db/client";
import { insertHotspotsIgnoringDuplicates } from "@/server/db/queries/videos/video-hotspots.queries";
import type { VideoHotspotRow } from "@/server/db/schema";
import { matchChapterToPlace, parseVideoChapters } from "@/lib/video-chapters";
import type { CatalogVideo } from "@/server/services/videos/video-catalog.service";

export const CHAPTER_PIPELINE_ACTOR = "pipeline:chapters";

/**
 * Hàm thuần: từ chapter (mốc do chính chủ kênh ghi trong mô tả), tạo hotspot cho chapter khớp tên một địa điểm.
 * `autoVerify` (khi phanh publish không bật) cho mốc hiện ngay với người dùng; mốc vẫn vào mẫu chấm hằng ngày.
 */
export function buildChapterHotspots(
  videos: Pick<CatalogVideo, "videoId" | "description">[],
  places: { id: string; name: string }[],
  now: Date,
  autoVerify: boolean
): Omit<VideoHotspotRow, "id">[] {
  const rows: Omit<VideoHotspotRow, "id">[] = [];
  for (const video of videos) {
    const seen = new Set<string>();
    for (const chapter of parseVideoChapters(video.description)) {
      const place = matchChapterToPlace(chapter.label, places);
      if (!place) continue;
      const key = `${place.id}:${chapter.timestampSec}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        videoId: video.videoId,
        placeId: place.id,
        timestampSec: chapter.timestampSec,
        label: chapter.label,
        source: "chapter",
        confidence: null,
        evidence: null,
        status: autoVerify ? "verified" : "pending",
        createdBy: CHAPTER_PIPELINE_ACTOR,
        verifiedBy: autoVerify ? CHAPTER_PIPELINE_ACTOR : null,
        createdAt: now,
        updatedAt: now,
      });
    }
  }
  return rows;
}

/** Quét toàn bộ catalog video và tạo mốc hotspot từ chapter. Trả số mốc tạo ra. */
export async function syncChapterHotspots(
  videos: CatalogVideo[],
  places: { id: string; name: string }[],
  autoVerify: boolean,
  now: Date = new Date()
): Promise<number> {
  const rows = buildChapterHotspots(videos, places, now, autoVerify);
  if (rows.length > 0 && isDatabaseConfigured()) await insertHotspotsIgnoringDuplicates(rows);
  return rows.length;
}
