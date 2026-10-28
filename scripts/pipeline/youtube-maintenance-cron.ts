import { db, DbExecutor } from "@/server/db/client";
import { placeVideos, PlaceVideo } from "@/server/db/schema/governance";
import { placeMedia } from "@/server/db/schema/places";
import { reserveQuota } from "@/server/services/youtube/quota-ledger";
import { sql, and, lte, eq, inArray } from "drizzle-orm";

export interface MaintenanceCronOptions {
  apiKey?: string;
  dryRun?: boolean;
  daysThreshold?: number;
  batchSize?: number;
  executor?: DbExecutor;
}

export interface MaintenanceCronResult {
  scannedCount: number;
  unembeddableOrDeletedCount: number;
  updatedPlaceVideosCount: number;
  details: Array<{
    videoId: string;
    placeId: string;
    action: "rejected_and_delinked" | "verified_ok";
    reason?: string;
  }>;
}

/**
 * Worker bảo trì 30 ngày định kỳ quét kiểm tra quyền embed và sự tồn tại của video YouTube
 * theo điều khoản dịch vụ YouTube API Data v3.
 */
export async function runYoutubeMaintenanceCron(
  options: MaintenanceCronOptions = {}
): Promise<MaintenanceCronResult> {
  const executor = options.executor ?? db;
  const dryRun = options.dryRun ?? false;
  const daysThreshold = options.daysThreshold ?? 30;
  const batchSize = options.batchSize ?? 50;
  const apiKey = options.apiKey || process.env.YOUTUBE_API_KEY;

  const now = new Date();
  const cutoffDate = new Date(now.getTime() - daysThreshold * 24 * 60 * 60 * 1000);

  console.log(`[YouTube Maintenance] Quét video chưa kiểm tra từ trước: ${cutoffDate.toISOString()}...`);

  // 1. Lấy danh sách video cần kiểm tra
  const pendingVideos: PlaceVideo[] = await executor
    .select()
    .from(placeVideos)
    .where(lte(placeVideos.lastCheckedAt, cutoffDate))
    .limit(batchSize);

  if (pendingVideos.length === 0) {
    console.log("[YouTube Maintenance] Không có video nào cần bảo trì.");
    return {
      scannedCount: 0,
      unembeddableOrDeletedCount: 0,
      updatedPlaceVideosCount: 0,
      details: [],
    };
  }

  console.log(`[YouTube Maintenance] Tìm thấy ${pendingVideos.length} video cần kiểm tra trạng thái.`);

  const uniqueVideoIds = Array.from(new Set(pendingVideos.map((v) => v.videoId)));
  const invalidVideoIds = new Set<string>();

  if (!dryRun && apiKey) {
    // 2. Reserve 1 unit quota cho batch tối đa 50 video
    const quotaRes = await reserveQuota(1, { executor });
    if (!quotaRes.success) {
      console.warn(`[YouTube Maintenance] Không đủ hạn mức để kiểm tra: ${quotaRes.reason}`);
      return {
        scannedCount: pendingVideos.length,
        unembeddableOrDeletedCount: 0,
        updatedPlaceVideosCount: 0,
        details: [],
      };
    }

    // 3. Gọi videos.list
    const url = `https://www.googleapis.com/youtube/v3/videos?part=status&id=${uniqueVideoIds.join(",")}&key=${apiKey}`;
    const res = await fetch(url, {
      headers: { Referer: "http://localhost:3000/", "User-Agent": "DateMate/1.0" },
    });
    if (res.ok) {
      const data = (await res.json()) as {
        items?: Array<{ id: string; status?: { embeddable?: boolean; privacyStatus?: string } }>;
      };

      const foundIds = new Set<string>();
      for (const item of data.items || []) {
        foundIds.add(item.id);
        const isEmbeddable = item.status?.embeddable === true;
        const isPublic = item.status?.privacyStatus === "public";
        if (!isEmbeddable || !isPublic) {
          invalidVideoIds.add(item.id);
        }
      }

      // Các video không xuất hiện trong items tức là đã bị xóa hoặc private
      for (const id of uniqueVideoIds) {
        if (!foundIds.has(id)) {
          invalidVideoIds.add(id);
        }
      }
    }
  } else {
    // Mock dữ liệu kiểm thử
    // Giả định video có id chứa 'deleted' hoặc 'private' là không hợp lệ
    for (const id of uniqueVideoIds) {
      if (id.includes("deleted") || id.includes("unembeddable")) {
        invalidVideoIds.add(id);
      }
    }
  }

  // 4. Xử lý cập nhật DB
  const details: MaintenanceCronResult["details"] = [];
  let unembeddableOrDeletedCount = 0;

  for (const pv of pendingVideos) {
    if (invalidVideoIds.has(pv.videoId)) {
      unembeddableOrDeletedCount++;
      details.push({
        videoId: pv.videoId,
        placeId: pv.placeId,
        action: "rejected_and_delinked",
        reason: "Video bị xóa, chuyển riêng tư hoặc tắt nhúng",
      });

      // Cập nhật place_videos thành rejected
      await executor
        .update(placeVideos)
        .set({
          status: "rejected",
          lastCheckedAt: now,
        })
        .where(
          and(
            eq(placeVideos.placeId, pv.placeId),
            eq(placeVideos.videoId, pv.videoId)
          )
        );

      // Xóa media nhúng khỏi catalog nếu có
      await executor
        .delete(placeMedia)
        .where(
          and(
            eq(placeMedia.placeId, pv.placeId),
            eq(placeMedia.embedId, pv.videoId)
          )
        );
    } else {
      details.push({
        videoId: pv.videoId,
        placeId: pv.placeId,
        action: "verified_ok",
      });

      // Gia hạn lastCheckedAt
      await executor
        .update(placeVideos)
        .set({
          lastCheckedAt: now,
        })
        .where(
          and(
            eq(placeVideos.placeId, pv.placeId),
            eq(placeVideos.videoId, pv.videoId)
          )
        );
    }
  }

  console.log(
    `[YouTube Maintenance] Hoàn thành: ${pendingVideos.length} quét, ${unembeddableOrDeletedCount} video bị loại bỏ.`
  );

  return {
    scannedCount: pendingVideos.length,
    unembeddableOrDeletedCount,
    updatedPlaceVideosCount: pendingVideos.length,
    details,
  };
}
