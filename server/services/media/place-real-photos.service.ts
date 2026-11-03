import { nanoid } from "nanoid";
import type { NewPlaceMedia } from "@/server/db/schema/places";
import { buildPlaceImageQuery, type BingImageResult } from "./bing-image-search";
import { rankImageCandidates, scoreImageCandidate } from "./image-candidate.filter";
import type { ImageCheck } from "./image-url.verifier";

export const TARGET_PHOTOS = 4;
export const MIN_PHOTOS = 2;
export const MAX_VERIFY_ATTEMPTS = 10;
export const REAL_PHOTO_LICENSE_NOTE = "Ảnh thực tế tham khảo từ web — bản quyền thuộc nguồn gốc";

const MIN_SCORE = 2;
const CAPTION_MAX = 200;

export interface RealPhoto {
  imageUrl: string;
  pageUrl: string | null;
  title: string;
  width: number;
  height: number;
}

export interface PlacePhotoOutcome {
  status: "found" | "needs_review";
  photos: RealPhoto[];
  query: string;
  /** Số kết quả Bing thô. */
  candidatesSeen: number;
  /** Đếm theo lý do: filter + ImageCheckFailReason + "low_score". */
  rejected: Record<string, number>;
}

export interface PhotoFinderDeps {
  search: (query: string) => Promise<BingImageResult[]>;
  verify: (url: string) => Promise<ImageCheck>;
  excludeUrls?: Set<string>;
}

const bump = (rec: Record<string, number>, key: string) => {
  rec[key] = (rec[key] ?? 0) + 1;
};

// Tìm ảnh thật cho 1 place: search Bing -> chấm điểm/lọc -> verify tuần tự tới khi đủ ảnh.
// Lỗi từ search (vd BingBlockedError) được ném tiếp nguyên vẹn.
export async function findRealPhotosForPlace(
  place: { id: string; name: string; area?: string | null },
  deps: PhotoFinderDeps,
): Promise<PlacePhotoOutcome> {
  const query = buildPlaceImageQuery(place);
  const raw = await deps.search(query);
  const rejected: Record<string, number> = {};

  // Dedupe theo imageUrl, bỏ URL đã dùng (excludeUrls không tính vào rejected)
  const seen = new Set<string>();
  const unique: BingImageResult[] = [];
  for (const r of raw) {
    if (seen.has(r.imageUrl) || deps.excludeUrls?.has(r.imageUrl)) continue;
    seen.add(r.imageUrl);
    unique.push(r);
  }

  for (const r of unique) {
    const { score, rejectReason } = scoreImageCandidate(r, place);
    if (rejectReason) bump(rejected, rejectReason);
    else if (score < MIN_SCORE) bump(rejected, "low_score");
  }

  const photos: RealPhoto[] = [];
  let attempts = 0;
  for (const c of rankImageCandidates(unique, place)) {
    if (photos.length >= TARGET_PHOTOS || attempts >= MAX_VERIFY_ATTEMPTS) break;
    attempts++;
    const check = await deps.verify(c.imageUrl);
    if (check.ok) {
      photos.push({
        imageUrl: c.imageUrl,
        pageUrl: c.pageUrl,
        title: c.title,
        width: check.width,
        height: check.height,
      });
    } else {
      bump(rejected, check.reason);
    }
  }

  return {
    status: photos.length >= MIN_PHOTOS ? "found" : "needs_review",
    photos,
    query,
    candidatesSeen: raw.length,
    rejected,
  };
}

// Host viết thường, bỏ tiền tố "www."; URL lỗi thì trả null.
function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function buildRealPhotoMediaRows(
  place: { id: string; name: string },
  photos: RealPhoto[],
): NewPlaceMedia[] {
  return photos.map((p, i) => ({
    id: `med_${nanoid(16)}`,
    placeId: place.id,
    type: "image",
    url: p.imageUrl,
    platform: "bing",
    embedId: null,
    caption: place.name.slice(0, CAPTION_MAX),
    credit: hostOf(p.pageUrl) ?? hostOf(p.imageUrl),
    sourceUrl: p.pageUrl ?? p.imageUrl,
    licenseNote: REAL_PHOTO_LICENSE_NOTE,
    license: "unverified",
    sortOrder: i,
  }));
}
