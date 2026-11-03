import {
  listRealPhotoMedia,
  removeRealPhotos,
  restoreStockGallery,
} from "@/server/db/queries/admin/place-media.queries";
import { revalidatePlaceCatalog } from "@/server/services/cache/revalidation";
import { runTrackedPipeline } from "@/server/services/pipeline/pipeline-run.service";
import { verifyImageUrl, type ImageCheck } from "./image-url.verifier";

export interface RecheckSummary {
  checked: number;
  dead: number;
  placesTouched: number;
  placesRestoredToStock: number;
  /** Cầu dao bật: quá nhiều ảnh chết cùng lúc nên không xóa gì. */
  aborted: boolean;
  abortReason?: string;
}

export interface RecheckDeps {
  listMedia: typeof listRealPhotoMedia;
  verify: (url: string) => Promise<ImageCheck>;
  remove: typeof removeRealPhotos;
  restore: typeof restoreStockGallery;
  now: () => Date;
  concurrency: number;
}

const DEFAULT_CONCURRENCY = 4;
// Cầu dao: chết hàng loạt thường do mạng/CDN chặn tạm, không phải link chết thật
const BREAKER_MIN_DEAD = 3;
const BREAKER_MAX_DEAD_RATIO = 0.2;

const defaultDeps: RecheckDeps = {
  listMedia: listRealPhotoMedia,
  verify: (url) => verifyImageUrl(url),
  remove: removeRealPhotos,
  restore: restoreStockGallery,
  now: () => new Date(),
  concurrency: DEFAULT_CONCURRENCY,
};

/**
 * Link chết thật sự: 4xx (trừ 408/429 là tạm), trả trang HTML thay cho ảnh, bytes không giải mã được,
 * hoặc URL không an toàn. Network, 5xx, loại nội dung lạ (vd octet-stream), ảnh đổi kích thước/tỉ lệ
 * là lỗi tạm hoặc không phải link chết nên giữ nguyên.
 */
export function isDeadImage(check: ImageCheck): boolean {
  if (check.ok) return false;
  if (check.reason === "decode_failed" || check.reason === "unsafe_url") return true;
  if (check.reason === "content_type") return check.contentType?.startsWith("text/html") ?? false;
  if (check.reason === "http_status") {
    const status = check.httpStatus;
    return status !== undefined && status >= 400 && status < 500 && status !== 408 && status !== 429;
  }
  return false;
}

/** Chạy `fn` cho từng phần tử với tối đa `limit` tác vụ đồng thời. */
async function mapWithLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  };
  const workers = Math.max(1, Math.min(Math.floor(limit) || 1, items.length));
  await Promise.all(Array.from({ length: workers }, worker));
  return results;
}

/** Kiểm tra lại ảnh thật: xóa link chết, place mất hết ảnh thật thì khôi phục bộ ảnh Unsplash. */
export async function recheckRealPhotos(deps: Partial<RecheckDeps> = {}): Promise<RecheckSummary> {
  const d: RecheckDeps = { ...defaultDeps, ...deps };

  const summary = await runTrackedPipeline("real_photos", async () => {
    const result: RecheckSummary = {
      checked: 0,
      dead: 0,
      placesTouched: 0,
      placesRestoredToStock: 0,
      aborted: false,
    };
    const media = await d.listMedia();
    const checks = await mapWithLimit(media, d.concurrency, (m) => d.verify(m.url));
    result.checked = media.length;

    const byPlace = new Map<string, Array<{ item: (typeof media)[number]; isDead: boolean }>>();
    media.forEach((item, i) => {
      const group = byPlace.get(item.placeId) ?? [];
      group.push({ item, isDead: isDeadImage(checks[i]) });
      byPlace.set(item.placeId, group);
    });

    for (const group of byPlace.values()) result.dead += group.filter((g) => g.isDead).length;

    // Cầu dao: tỉ lệ chết quá cao thì không xóa gì, để người kiểm tra tay
    if (result.dead >= BREAKER_MIN_DEAD && result.dead / result.checked > BREAKER_MAX_DEAD_RATIO) {
      result.aborted = true;
      result.abortReason = `Quá nhiều ảnh chết (${result.dead}/${result.checked}) — nghi lỗi mạng/CDN, không xóa gì`;
      console.warn(`[real-photos-recheck] ${result.abortReason}`);
      return {
        result,
        status: "paused" as const,
        promotedCount: 0,
        summary: { mode: "recheck", ...result },
      };
    }

    const now = d.now();
    for (const [placeId, group] of byPlace) {
      const deadIds = group.filter((g) => g.isDead).map((g) => g.item.id);
      if (deadIds.length === 0) continue;

      const alive = group.filter((g) => !g.isDead).sort((a, b) => a.item.sortOrder - b.item.sortOrder);
      if (alive.length > 0) {
        await d.remove(placeId, deadIds, alive[0].item.url, now);
      } else {
        await d.restore(placeId, group[0].item.category, deadIds, now);
        result.placesRestoredToStock++;
      }
      result.placesTouched++;
    }

    return {
      result,
      status: "success" as const,
      promotedCount: result.placesTouched,
      summary: { mode: "recheck", ...result },
    };
  });

  if (summary.placesTouched > 0) {
    try {
      await revalidatePlaceCatalog();
    } catch {
      // Ngoài ngữ cảnh Next (CLI/test) thì bỏ qua
    }
  }
  return summary;
}
