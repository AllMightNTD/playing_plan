import {
  listPlacesForRealPhotoSync,
  replacePlaceImages,
} from "@/server/db/queries/admin/place-media.queries";
import { revalidatePlaceCatalog } from "@/server/services/cache/revalidation";
import { runTrackedPipeline } from "@/server/services/pipeline/pipeline-run.service";
import { BingBlockedError, searchBingImages, type BingImageResult } from "./bing-image-search";
import { verifyImageUrl, type ImageCheck } from "./image-url.verifier";
import { buildRealPhotoMediaRows, findRealPhotosForPlace } from "./place-real-photos.service";

export interface RealPhotoSyncOptions {
  limit?: number;
  slug?: string;
  force?: boolean;
  dryRun?: boolean;
  /** Khoảng nghỉ cơ bản giữa 2 place (ms), mặc định 2500. */
  delayMs?: number;
}

export interface RealPhotoSyncSummary {
  processed: number;
  replaced: number;
  photosInserted: number;
  needsReview: Array<{
    slug: string;
    found: number;
    rejected: Record<string, number>;
    error?: string;
    /** Không có khi search lỗi (chưa có kết quả). */
    query?: string;
    candidatesSeen?: number;
  }>;
  /** Place đã gán ảnh (hoặc sẽ gán khi dryRun), để người duyệt soi lại từng ảnh. */
  found: Array<{
    slug: string;
    query: string;
    photos: Array<{ imageUrl: string; pageUrl: string | null; title: string }>;
  }>;
  blocked: boolean;
  /** Dừng sớm vì lỗi DB liên tiếp. */
  aborted: boolean;
  abortReason?: "db_errors";
}

export interface RealPhotoSyncDeps {
  listPlaces: typeof listPlacesForRealPhotoSync;
  replaceImages: typeof replacePlaceImages;
  search: (q: string) => Promise<BingImageResult[]>;
  verify: (url: string) => Promise<ImageCheck>;
  sleep: (ms: number) => Promise<void>;
  random: () => number;
  now: () => Date;
}

const DEFAULT_DELAY_MS = 2500;
const JITTER_MS = 1500;
const MAX_CONSECUTIVE_DB_ERRORS = 3;

/**
 * Đọc REAL_PHOTOS_DAILY_LIMIT cho daily pipeline: mặc định tắt (0).
 * Chỉ số nguyên dương viết rõ mới bật; rỗng/NaN/âm đều là 0 để cron không tự ghi ảnh chưa duyệt.
 */
export function resolveRealPhotosDailyLimit(raw: string | undefined): number {
  const trimmed = raw?.trim() ?? "";
  if (!/^\d+$/.test(trimmed)) return 0;
  return Number.parseInt(trimmed, 10);
}

const errMsg = (err: unknown) => (err instanceof Error ? err.message : String(err));

const defaultDeps: RealPhotoSyncDeps = {
  listPlaces: listPlacesForRealPhotoSync,
  replaceImages: replacePlaceImages,
  search: (q) => searchBingImages(q),
  verify: (url) => verifyImageUrl(url),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  random: Math.random,
  now: () => new Date(),
};

/** Tìm ảnh thật cho từng place theo lô; dừng ngay khi Bing chặn (captcha). */
export async function runRealPhotoSync(
  opts: RealPhotoSyncOptions = {},
  deps: Partial<RealPhotoSyncDeps> = {},
): Promise<RealPhotoSyncSummary> {
  const d: RealPhotoSyncDeps = { ...defaultDeps, ...deps };
  const delayMs = opts.delayMs ?? DEFAULT_DELAY_MS;

  const summary = await runTrackedPipeline("real_photos", async () => {
    const result: RealPhotoSyncSummary = {
      processed: 0,
      replaced: 0,
      photosInserted: 0,
      needsReview: [],
      found: [],
      blocked: false,
      aborted: false,
    };
    const targets = await d.listPlaces({ limit: opts.limit, slug: opts.slug, force: opts.force });
    // URL ảnh đã gán trong run này: chi nhánh cùng chuỗi không bị trùng bộ ảnh
    const usedUrls = new Set<string>();
    let consecutiveDbErrors = 0;

    for (let i = 0; i < targets.length; i++) {
      const place = targets[i];
      // Chỉ nghỉ giữa các place để tránh bị Bing chặn, không nghỉ trước place đầu
      if (i > 0) await d.sleep(delayMs + d.random() * JITTER_MS);

      let outcome;
      try {
        outcome = await findRealPhotosForPlace(
          { id: place.id, name: place.name, area: place.area },
          { search: d.search, verify: d.verify, excludeUrls: usedUrls },
        );
      } catch (err) {
        if (err instanceof BingBlockedError) {
          console.warn(`[real-photos] Bing chặn tại ${place.slug}: ${err.message} — dừng run`);
          result.blocked = true;
          break;
        }
        const error = errMsg(err);
        console.warn(`[real-photos] Lỗi tìm ảnh cho ${place.slug}: ${error}`);
        result.needsReview.push({ slug: place.slug, found: 0, rejected: { search_error: 1 }, error });
        result.processed++;
        continue;
      }

      if (outcome.status === "found") {
        const rows = buildRealPhotoMediaRows({ id: place.id, name: place.name }, outcome.photos);
        try {
          if (!opts.dryRun) await d.replaceImages(place.id, rows, d.now());
          consecutiveDbErrors = 0;
          result.replaced++;
          result.photosInserted += rows.length;
          for (const p of outcome.photos) usedUrls.add(p.imageUrl);
          result.found.push({
            slug: place.slug,
            query: outcome.query,
            photos: outcome.photos.map((p) => ({ imageUrl: p.imageUrl, pageUrl: p.pageUrl, title: p.title })),
          });
        } catch (err) {
          const error = errMsg(err);
          console.warn(`[real-photos] Lỗi ghi DB cho ${place.slug}: ${error}`);
          result.needsReview.push({
            slug: place.slug,
            found: outcome.photos.length,
            rejected: { ...outcome.rejected, db_error: 1 },
            error,
            query: outcome.query,
            candidatesSeen: outcome.candidatesSeen,
          });
          consecutiveDbErrors++;
        }
      } else {
        result.needsReview.push({
          slug: place.slug,
          found: outcome.photos.length,
          rejected: outcome.rejected,
          query: outcome.query,
          candidatesSeen: outcome.candidatesSeen,
        });
      }
      result.processed++;

      if (consecutiveDbErrors >= MAX_CONSECUTIVE_DB_ERRORS) {
        console.warn(`[real-photos] ${consecutiveDbErrors} lần ghi DB lỗi liên tiếp — dừng run`);
        result.aborted = true;
        result.abortReason = "db_errors";
        break;
      }
    }

    return {
      result,
      status: result.blocked || result.aborted ? ("paused" as const) : ("success" as const),
      // dryRun không ghi gì nên không tính là đã thăng hạng
      promotedCount: opts.dryRun ? 0 : result.replaced,
      summary: { ...result, dryRun: Boolean(opts.dryRun) },
    };
  });

  if (summary.replaced > 0 && !opts.dryRun) {
    try {
      await revalidatePlaceCatalog();
    } catch {
      // Ngoài ngữ cảnh Next (CLI/test) thì bỏ qua
    }
  }
  return summary;
}
