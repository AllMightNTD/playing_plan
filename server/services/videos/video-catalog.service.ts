import * as fs from "fs";
import * as path from "path";
import { isDatabaseConfigured } from "@/server/db/client";
import { listCatalogRows, upsertCatalogRows } from "@/server/db/queries/videos/video-catalog.queries";
import type { NewVideoCatalogRow, VideoCatalogRow } from "@/server/db/schema";

/** Video review đã cào, dạng dùng chung cho catalog người dùng và bộ so khớp video ↔ địa điểm. */
export interface CatalogVideo {
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
  /** ISO 8601 từ YouTube Data API, vd "PT12M30S" */
  duration?: string;
  durationSec?: number;
}

/** File kết quả cào cục bộ: chỉ là nguồn nhập (`pnpm video:import`) và dữ liệu cho chế độ demo không DB. */
export const LOCAL_RAW_VIDEOS_PATH = path.resolve(process.cwd(), "scripts/output/youtube/raw_videos.json");

export function readLocalRawVideos(filePath: string = LOCAL_RAW_VIDEOS_PATH): CatalogVideo[] {
  if (!fs.existsSync(filePath)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("[VideoCatalog] Lỗi đọc file video cục bộ:", err);
    return [];
  }
}

/** "PT1H2M3S" → 3723 giây; chuỗi không hợp lệ trả null. */
export function parseIsoDuration(value: string | undefined): number | null {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(value ?? "");
  if (!match || match.slice(1).every((part) => part === undefined)) return null;
  const [, h = "0", m = "0", s = "0"] = match;
  return Number(h) * 3600 + Number(m) * 60 + Number(s);
}

function toCatalogVideo(row: VideoCatalogRow): CatalogVideo {
  return {
    videoId: row.videoId,
    title: row.title,
    description: row.description ?? "",
    channelId: row.channelId,
    channelTitle: row.channelTitle,
    viewCount: row.viewCount,
    likeCount: row.likeCount ?? undefined,
    commentCount: row.commentCount ?? undefined,
    publishedAt: (row.publishedAt ?? row.importedAt).toISOString(),
    isEmbeddable: row.isEmbeddable,
    searchCategory: row.searchCategory ?? undefined,
    searchLocation: row.searchLocation ?? undefined,
    searchFocus: row.searchFocus ?? undefined,
    durationSec: row.durationSec ?? undefined,
  };
}

function toCatalogRow(video: CatalogVideo, now: Date): NewVideoCatalogRow {
  const publishedAt = video.publishedAt ? new Date(video.publishedAt) : null;
  return {
    videoId: video.videoId,
    title: video.title.slice(0, 300),
    description: video.description || null,
    channelId: video.channelId,
    channelTitle: video.channelTitle.slice(0, 200),
    viewCount: Math.min(Number(video.viewCount) || 0, 2_147_483_647),
    likeCount: video.likeCount ?? null,
    commentCount: video.commentCount ?? null,
    publishedAt: publishedAt && !Number.isNaN(publishedAt.getTime()) ? publishedAt : null,
    isEmbeddable: video.isEmbeddable !== false,
    searchCategory: video.searchCategory?.slice(0, 50) ?? null,
    searchLocation: video.searchLocation?.slice(0, 100) ?? null,
    searchFocus: video.searchFocus?.slice(0, 100) ?? null,
    durationSec: video.durationSec ?? parseIsoDuration(video.duration),
    importedAt: now,
    updatedAt: now,
  };
}

/**
 * Nguồn video lúc chạy: bảng video_catalog. Khi dev, nếu chưa có DB, bảng chưa migrate hoặc chưa nạp video
 * (`pnpm video:import`) thì đọc file kết quả cào cục bộ để trang video không trống.
 * Production chỉ đọc DB (file bị gitignore, không có khi deploy): lỗi DB được ném ra để giám sát thấy.
 */
export async function loadCatalogVideos(): Promise<CatalogVideo[]> {
  const isProduction = process.env.NODE_ENV === "production";
  if (!isDatabaseConfigured()) return isProduction ? [] : readLocalRawVideos();

  try {
    const rows = await listCatalogRows();
    if (rows.length > 0 || isProduction) return rows.map(toCatalogVideo);
    console.warn("[VideoCatalog] Bảng video_catalog đang trống, dùng file cục bộ. Chạy `pnpm video:import` để nạp video vào DB.");
  } catch (err) {
    if (isProduction) throw err;
    console.warn("[VideoCatalog] Không đọc được video_catalog (đã chạy `pnpm db:migrate` chưa?), dùng file cục bộ:", err);
  }
  return readLocalRawVideos();
}

/** Lưu kết quả cào thật vào DB (upsert). Trả số video đã ghi. */
export async function saveCatalogVideos(videos: CatalogVideo[], now: Date = new Date()): Promise<number> {
  const rows = videos.filter((v) => v.videoId && v.title && v.channelId).map((v) => toCatalogRow(v, now));
  if (rows.length === 0 || !isDatabaseConfigured()) return 0;
  await upsertCatalogRows(rows);
  return rows.length;
}
