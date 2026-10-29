import { isDatabaseConfigured } from "@/server/db/client";
import { listHotspotsByVideo } from "@/server/db/queries/videos/video-hotspots.queries";
import { getAllPublishedPlaces } from "@/server/services/user/places.service";
import { formatTimestamp } from "@/lib/video-chapters";

export interface VideoHotspot {
  id: string;
  placeId: string;
  placeSlug: string;
  placeName: string;
  area: string;
  categoryLabel: string;
  emoji: string;
  timestampSeconds: number;
  timeFormatted: string;
  label: string | null;
}

export interface VideoHotspotsDetail {
  videoId: string;
  hotspots: VideoHotspot[];
}

/**
 * Mốc địa điểm trong video cho người dùng: chỉ mốc đã được admin duyệt và địa điểm còn xuất bản.
 * Video chưa có mốc nào (hoặc chưa có DB) thì trả danh sách rỗng, không tự sinh mốc.
 */
export async function getVideoHotspots(videoId: string): Promise<VideoHotspotsDetail> {
  if (!isDatabaseConfigured()) return { videoId, hotspots: [] };

  const [rows, publishedPlaces] = await Promise.all([listHotspotsByVideo(videoId, "verified"), getAllPublishedPlaces()]);
  const placeById = new Map(publishedPlaces.map((place) => [place.id, place]));

  const hotspots: VideoHotspot[] = [];
  for (const row of rows) {
    const place = placeById.get(row.placeId);
    if (!place) continue;
    hotspots.push({
      id: row.id,
      placeId: place.id,
      placeSlug: place.slug,
      placeName: place.name,
      area: place.area,
      categoryLabel: place.categoryLabel,
      emoji: place.emoji,
      timestampSeconds: row.timestampSec,
      timeFormatted: formatTimestamp(row.timestampSec),
      label: row.label,
    });
  }
  return { videoId, hotspots };
}
