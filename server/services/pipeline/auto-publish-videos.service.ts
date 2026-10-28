import { db } from "@/server/db/client";
import { places, placeMedia, Place } from "@/server/db/schema/places";
import { placeVideos, candidatePlaces } from "@/server/db/schema/governance";
import { matchVideosWithPlaces, VideoForMatching, PlaceForMatching } from "@/server/services/matching/place-video.matcher";
import { revalidatePlaceCatalog } from "@/server/services/cache/revalidation";
import { nanoid } from "nanoid";
import { eq, and, sql } from "drizzle-orm";
import fs from "fs";
import path from "path";

export interface AutoPublishOptions {
  executor?: any;
  minConfidence?: number;
  rawVideosPath?: string;
  revalidate?: boolean;
}

export interface AutoPublishResult {
  totalProcessedVideos: number;
  matchedWithPlacesCount: number;
  publishedToMediaCount: number;
  placesUpdatedCount: number;
  details: Array<{
    placeId: string;
    placeName: string;
    videoId: string;
    videoTitle: string;
    channelTitle: string;
    score: number;
  }>;
}

export interface RawVideoItem {
  videoId: string;
  title: string;
  description: string;
  channelId: string;
  channelTitle: string;
  viewCount: number;
  likeCount?: number;
  commentCount?: number;
  publishedAt: string;
  isEmbeddable: boolean;
  searchCategory?: string;
  searchLocation?: string;
  searchFocus?: string;
}

/**
 * Tải danh sách video đã cào từ file raw_videos.json
 */
export function loadRawVideos(customPath?: string): RawVideoItem[] {
  const filePath = customPath || path.resolve(process.cwd(), "scripts/output/youtube/raw_videos.json");
  if (!fs.existsSync(filePath)) {
    console.warn(`[AutoPublish] Không tìm thấy file video tại: ${filePath}`);
    return [];
  }
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error(`[AutoPublish] Lỗi parse file video:`, err);
    return [];
  }
}

/**
 * Tự động xuất bản các video review YouTube đã match vào bảng place_media và place_videos
 * Quy trình:
 * 1. Lấy toàn bộ địa điểm chính thức (places) từ DB.
 * 2. Lấy video đầu vào (từ raw_videos.json hoặc truyền vào).
 * 3. Chạy thuật toán so khớp địa danh & ngữ cảnh (place-video matcher).
 * 4. Với các video đạt ngưỡng điểm tự động (mặc định >= 60 điểm):
 *    - Kiểm tra xem đã có trong place_media chưa.
 *    - Nếu chưa, insert vào place_media với type='video', platform='youtube', license='embed_only'.
 *    - Cập nhật bản ghi trong place_videos thành status='verified' hoặc 'auto_linked'.
 * 5. Gọi revalidate cache ISR của Next.js để end-user thấy ngay trên web.
 */
export async function autoPublishMatchedVideos(
  options: AutoPublishOptions = {}
): Promise<AutoPublishResult> {
  const executor = options.executor || db;
  const minConfidence = options.minConfidence ?? 60;
  const revalidate = options.revalidate ?? true;

  // 1. Tải danh sách places chính thức
  const allPlaces: Place[] = await executor
    .select()
    .from(places)
    .where(eq(places.status, "published"));

  if (allPlaces.length === 0) {
    return {
      totalProcessedVideos: 0,
      matchedWithPlacesCount: 0,
      publishedToMediaCount: 0,
      placesUpdatedCount: 0,
      details: [],
    };
  }

  // 2. Tải raw videos
  const rawVideos = loadRawVideos(options.rawVideosPath);
  if (rawVideos.length === 0) {
    return {
      totalProcessedVideos: 0,
      matchedWithPlacesCount: 0,
      publishedToMediaCount: 0,
      placesUpdatedCount: 0,
      details: [],
    };
  }

  // 3. Chuẩn bị dữ liệu cho Matcher
  const placesForMatch: PlaceForMatching[] = allPlaces.map((p) => ({
    id: p.id,
    name: p.name,
    address: p.address,
    district: p.area || p.city,
  }));

  const videosForMatch: VideoForMatching[] = rawVideos
    .filter((v) => v.isEmbeddable)
    .map((v) => ({
      videoId: v.videoId,
      title: v.title,
      description: v.description,
      channelId: v.channelId,
      channelTitle: v.channelTitle,
      publishedAt: v.publishedAt,
    }));

  const matches = matchVideosWithPlaces(placesForMatch, videosForMatch);

  // Lọc các match đạt ngưỡng điểm
  const qualifyingMatches = matches.filter((m) => m.score >= minConfidence);

  const details: AutoPublishResult["details"] = [];
  const updatedPlaceIds = new Set<string>();
  let publishedToMediaCount = 0;
  const now = new Date();

  // 4. Lấy danh sách media hiện có để tránh duplicate
  const existingMediaRows = await executor
    .select({
      placeId: placeMedia.placeId,
      embedId: placeMedia.embedId,
    })
    .from(placeMedia)
    .where(eq(placeMedia.type, "video"));

  const existingMediaSet = new Set(
    existingMediaRows.map((m: { placeId: string; embedId: string | null }) => `${m.placeId}:${m.embedId}`)
  );

  for (const m of qualifyingMatches) {
    const place = allPlaces.find((p) => p.id === m.placeId);
    const video = rawVideos.find((v) => v.videoId === m.videoId);
    if (!place || !video) continue;

    const key = `${place.id}:${video.videoId}`;

    // Lưu / Cập nhật vào place_videos
    await executor
      .insert(placeVideos)
      .values({
        placeId: place.id,
        videoId: video.videoId,
        channelId: video.channelId,
        channelTitle: video.channelTitle,
        hasPaidPlacement: false,
        confidenceScore: m.score.toFixed(2),
        status: m.score >= 70 ? "auto_linked" : "verified",
        publishedAt: video.publishedAt ? new Date(video.publishedAt) : now,
        lastCheckedAt: now,
      })
      .onDuplicateKeyUpdate({
        set: {
          confidenceScore: m.score.toFixed(2),
          status: m.score >= 70 ? "auto_linked" : "verified",
          lastCheckedAt: now,
        },
      });

    // Nếu chưa có trong place_media, tiến hành xuất bản
    if (!existingMediaSet.has(key)) {
      await executor.insert(placeMedia).values({
        id: `med_${nanoid(16)}`,
        placeId: place.id,
        type: "video",
        url: `https://www.youtube.com/watch?v=${video.videoId}`,
        platform: "youtube",
        embedId: video.videoId,
        caption: video.title,
        credit: video.channelTitle,
        sourceUrl: `https://www.youtube.com/watch?v=${video.videoId}`,
        licenseNote: "Nhúng YouTube chính thức từ reviewer ẩm thực/du lịch",
        license: "embed_only",
        sortOrder: 10,
      });

      existingMediaSet.add(key);
      publishedToMediaCount++;
      updatedPlaceIds.add(place.id);
    }

    details.push({
      placeId: place.id,
      placeName: place.name,
      videoId: video.videoId,
      videoTitle: video.title,
      channelTitle: video.channelTitle,
      score: m.score,
    });
  }

  // 5. Kích hoạt Next.js ISR Revalidate nếu có cập nhật
  if (revalidate && publishedToMediaCount > 0) {
    try {
      revalidatePlaceCatalog();
    } catch (err) {
      console.warn("[AutoPublish] Bỏ qua revalidation (có thể đang chạy trong CLI context):", err);
    }
  }

  return {
    totalProcessedVideos: rawVideos.length,
    matchedWithPlacesCount: qualifyingMatches.length,
    publishedToMediaCount,
    placesUpdatedCount: updatedPlaceIds.size,
    details,
  };
}
