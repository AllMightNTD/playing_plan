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
  needsReview: Array<{ slug: string; found: number; rejected: Record<string, number> }>;
  blocked: boolean;
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
      blocked: false,
    };
    const targets = await d.listPlaces({ limit: opts.limit, slug: opts.slug, force: opts.force });

    for (let i = 0; i < targets.length; i++) {
      const place = targets[i];
      // Chỉ nghỉ giữa các place để tránh bị Bing chặn, không nghỉ trước place đầu
      if (i > 0) await d.sleep(delayMs + d.random() * JITTER_MS);

      let outcome;
      try {
        outcome = await findRealPhotosForPlace(
          { id: place.id, name: place.name, area: place.area },
          { search: d.search, verify: d.verify },
        );
      } catch (err) {
        if (err instanceof BingBlockedError) {
          result.blocked = true;
          break;
        }
        result.needsReview.push({ slug: place.slug, found: 0, rejected: { search_error: 1 } });
        result.processed++;
        continue;
      }

      if (outcome.status === "found") {
        const rows = buildRealPhotoMediaRows({ id: place.id, name: place.name }, outcome.photos);
        try {
          if (!opts.dryRun) await d.replaceImages(place.id, rows, d.now());
          result.replaced++;
          result.photosInserted += rows.length;
        } catch {
          result.needsReview.push({
            slug: place.slug,
            found: outcome.photos.length,
            rejected: { ...outcome.rejected, db_error: 1 },
          });
        }
      } else {
        result.needsReview.push({
          slug: place.slug,
          found: outcome.photos.length,
          rejected: outcome.rejected,
        });
      }
      result.processed++;
    }

    return {
      result,
      status: result.blocked ? ("paused" as const) : ("success" as const),
      promotedCount: result.replaced,
      summary: { ...result },
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
