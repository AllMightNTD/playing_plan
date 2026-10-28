import { CURATED_YOUTUBE_CHANNELS, YouTubeChannelConfig } from "@/server/config/youtube-channels";
import { reserveQuota, getQuotaStatus } from "@/server/services/youtube/quota-ledger";
import * as fs from "fs";
import * as path from "path";

export const HANOI_YOUTUBE_CHANNELS = CURATED_YOUTUBE_CHANNELS;

export interface RawYoutubeVideo {
  videoId: string;
  title: string;
  description: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  isEmbeddable: boolean;
  privacyStatus: string;
  hasPaidProductPlacement: boolean;
  fetchedAt: string;
}

export interface SyncChannelsOptions {
  apiKey?: string;
  dryRun?: boolean;
  maxChannels?: number;
  outputDir?: string;
}

/**
 * Xử lý đồng bộ video từ các kênh YouTube tuyển chọn với chi phí hạn mức tối ưu:
 * - 1 unit cho 1 playlistItems.list lấy 50 video mới nhất.
 * - 1 unit cho 1 videos.list batch lấy chi tiết 50 video đó.
 * => Đúng 2 units / 50 video / kênh.
 */
export async function syncYoutubeChannels(options: SyncChannelsOptions = {}): Promise<{
  totalChannelsProcessed: number;
  totalVideosIngested: number;
  totalUnitsReserved: number;
  videos: RawYoutubeVideo[];
}> {
  const apiKey = options.apiKey || process.env.YOUTUBE_API_KEY;
  const dryRun = options.dryRun || !apiKey;
  const maxChannels = options.maxChannels || HANOI_YOUTUBE_CHANNELS.length;
  const channels = HANOI_YOUTUBE_CHANNELS.slice(0, maxChannels);

  const outputDir = options.outputDir || path.resolve(process.cwd(), "scripts/output/youtube");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const allVideos: RawYoutubeVideo[] = [];
  let totalUnits = 0;

  console.log(`[YouTube Sync] Bắt đầu đồng bộ ${channels.length} kênh (dryRun: ${dryRun})...`);

  for (const channel of channels) {
    const channelId = channel.id;
    const channelTitle = channel.title;
    console.log(`[YouTube Sync] Đang xử lý kênh: ${channelTitle} (${channelId})...`);

    // 1. Reserve quota: 1 unit cho playlistItems.list
    if (!dryRun) {
      const res1 = await reserveQuota(1);
      if (!res1.success) {
        console.warn(`[YouTube Sync] Không thể đặt quota (Halt hoặc vượt ngưỡng): ${res1.reason}`);
        break;
      }
      totalUnits += 1;
    }

    let videoIds: string[] = [];
    if (!dryRun && apiKey) {
      // Thực hiện gọi API thật
      const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${channel.uploadsPlaylistId}&maxResults=50&key=${apiKey}`;
      const plRes = await fetch(playlistUrl, {
        headers: { Referer: "http://localhost:3000/", "User-Agent": "DateMate/1.0" },
      });
      if (plRes.ok) {
        const plData = (await plRes.json()) as {
          items?: Array<{ contentDetails?: { videoId?: string } }>;
        };
        videoIds = (plData.items || [])
          .map((item) => item.contentDetails?.videoId)
          .filter((id): id is string => Boolean(id));
      } else {
        console.error(`[YouTube Sync] Lỗi gọi playlistItems cho kênh ${channelTitle}: ${plRes.statusText}`);
      }
    } else {
      // Dữ liệu giả lập cho dry run hoặc môi trường test
      videoIds = [
        `mock_${channelId}_vid1`,
        `mock_${channelId}_vid2`,
      ];
    }

    if (videoIds.length === 0) {
      console.log(`[YouTube Sync] Không có video nào cho kênh ${channelTitle}`);
      continue;
    }

    // 2. Reserve quota: 1 unit cho videos.list (batch 50 ids)
    if (!dryRun) {
      const res2 = await reserveQuota(1);
      if (!res2.success) {
        console.warn(`[YouTube Sync] Không thể đặt quota cho videos.list: ${res2.reason}`);
        break;
      }
      totalUnits += 1;
    }

    if (!dryRun && apiKey) {
      const vUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,status,contentDetails,paidProductPlacementDetails&id=${videoIds.join(",")}&key=${apiKey}`;
      const vRes = await fetch(vUrl, {
        headers: { Referer: "http://localhost:3000/", "User-Agent": "DateMate/1.0" },
      });
      if (vRes.ok) {
        const vData = (await vRes.json()) as {
          items?: Array<{
            id: string;
            snippet?: {
              title?: string;
              description?: string;
              channelId?: string;
              channelTitle?: string;
              publishedAt?: string;
            };
            status?: {
              embeddable?: boolean;
              privacyStatus?: string;
            };
            statistics?: {
              viewCount?: string;
              likeCount?: string;
            };
            paidProductPlacementDetails?: {
              hasPaidProductPlacement?: boolean;
            };
          }>;
        };

        for (const item of vData.items || []) {
          // Tiêu chí chấp thuận: status.embeddable === true & privacyStatus === 'public'
          const isEmbeddable = item.status?.embeddable === true;
          const isPublic = item.status?.privacyStatus === "public";

          if (!isEmbeddable || !isPublic) {
            console.log(`[YouTube Sync] Bỏ qua video không hợp lệ ${item.id} (embeddable: ${isEmbeddable}, privacy: ${item.status?.privacyStatus})`);
            continue;
          }

          allVideos.push({
            videoId: item.id,
            title: item.snippet?.title || "",
            description: item.snippet?.description || "",
            channelId: item.snippet?.channelId || channelId,
            channelTitle: item.snippet?.channelTitle || channelTitle,
            publishedAt: item.snippet?.publishedAt || new Date().toISOString(),
            viewCount: Number(item.statistics?.viewCount || 0),
            likeCount: Number(item.statistics?.likeCount || 0),
            isEmbeddable,
            privacyStatus: item.status?.privacyStatus || "public",
            hasPaidProductPlacement: Boolean(item.paidProductPlacementDetails?.hasPaidProductPlacement),
            fetchedAt: new Date().toISOString(),
          });
        }
      }
    } else {
      // Mock data dry run
      for (const vid of videoIds) {
        allVideos.push({
          videoId: vid,
          title: `[Hà Nội Date] Top quán cà phê view hồ Tây cực chill cùng người yêu - ${channelTitle}`,
          description: `Gợi ý các điểm hẹn hò lãng mạn tại Tây Hồ và Ba Đình. Đừng bỏ lỡ quán cà phê view hồ đẹp ngất ngây.`,
          channelId: channelId,
          channelTitle: channelTitle,
          publishedAt: new Date().toISOString(),
          viewCount: 45000,
          likeCount: 1800,
          isEmbeddable: true,
          privacyStatus: "public",
          hasPaidProductPlacement: false,
          fetchedAt: new Date().toISOString(),
        });
      }
    }
  }

  // Ghi kết quả ra file cache cục bộ
  const outputPath = path.join(outputDir, "raw_videos.json");
  fs.writeFileSync(outputPath, JSON.stringify(allVideos, null, 2), "utf-8");
  console.log(`[YouTube Sync] Hoàn thành! Đã lưu ${allVideos.length} videos vào ${outputPath}`);

  return {
    totalChannelsProcessed: channels.length,
    totalVideosIngested: allVideos.length,
    totalUnitsReserved: totalUnits,
    videos: allVideos,
  };
}

// Chạy trực tiếp nếu execute từ CLI
if (require.main === module) {
  syncYoutubeChannels({ dryRun: true, maxChannels: 5 })
    .then((res) => {
      console.log(`[Done] Processed: ${res.totalChannelsProcessed} channels, Videos: ${res.totalVideosIngested}`);
    })
    .catch((err) => {
      console.error("[Fatal Error]", err);
      process.exit(1);
    });
}
