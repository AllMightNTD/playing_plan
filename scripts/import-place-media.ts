/**
 * Import ứng viên media (scripts/output/place-media-candidates.json) vào TiDB.
 *  1. Seed 10 địa điểm từ lib/mock-data.ts vào `places` + `place_guides` ở trạng thái DRAFT nếu chưa có
 *     (app vẫn dùng catalog seed trong code cho tới khi admin xuất bản; không ghi đè bản ghi admin đã sửa).
 *  2. Ghi `place_media`: tối đa 4 ảnh Unsplash + 2 ảnh Wikimedia mỗi nơi; bỏ qua mọi ảnh `internalOnly`.
 *  3. Đặt ảnh đầu tiên làm `cover_url` cho nơi chưa có ảnh bìa.
 * Ảnh Unsplash chỉ được ghi sau khi gọi download_location thành công (điều khoản Unsplash API);
 * hết quota thì dừng phần Unsplash, lần chạy sau sẽ bổ sung. Id media cố định theo (place, url) nên chạy lại không trùng.
 *
 * Chạy: pnpm media:import
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { connect } from "@tidbcloud/serverless";
import { HANOI_PLACES } from "../lib/mock-data.ts";
import { buildPlaceSearchFields } from "../lib/search.ts";
import type { HanoiPlace } from "../lib/types/catalog.ts";

interface Candidate {
  provider: string;
  type: "image" | "video";
  platform: string;
  license: string;
  licenseNote: string;
  url: string;
  embedId: string | null;
  sourcePage: string;
  caption: string;
  credit: string;
  internalOnly?: true;
  trackDownloadUrl?: string;
}

interface CandidatesFile {
  places: { slug: string; candidates: Candidate[] }[];
}

interface ImportStats {
  seededPlaces: number;
  insertedMedia: number;
  skippedExisting: number;
  coversSet: number;
  unsplashDeferred: number;
}

type TiDbConnection = ReturnType<typeof connect>;

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const CANDIDATES_FILE = join(SCRIPT_DIR, "output", "place-media-candidates.json");
const MEDIA_QUOTA: Record<string, number> = { unsplash: 4, wikimedia: 2 };
const IMPORTABLE_LICENSES = new Set(["cc0", "licensed", "embed_only"]);
const MIN_UNSPLASH_REMAINING = 1;
const REQUEST_TIMEOUT_MS = 15_000;
const HANOI_SUFFIX = ", Hà Nội";
const VND_PER_THOUSAND = 1000;

/** Id ổn định theo (place, url) để chạy lại script không sinh bản ghi trùng. */
function toMediaId(placeId: string, url: string): string {
  return createHash("sha256").update(`${placeId}|${url}`).digest("base64url").slice(0, 21);
}

/** Chỉ lấy khoảng giá dạng "200k - 400k"; các mô tả tự do khác để 0 cho admin nhập lại. */
function parseCostRange(costText: string): { min: number; max: number } {
  const range = costText.match(/(\d+)k\s*-\s*(\d+)k/i);
  if (!range) return { min: 0, max: 0 };
  return { min: Number(range[1]) * VND_PER_THOUSAND, max: Number(range[2]) * VND_PER_THOUSAND };
}

function selectMedia(candidates: Candidate[]): Candidate[] {
  const used: Record<string, number> = {};
  return candidates
    .filter((candidate) => !candidate.internalOnly && IMPORTABLE_LICENSES.has(candidate.license))
    .filter((candidate) => candidate.provider in MEDIA_QUOTA)
    .sort((a, b) => Object.keys(MEDIA_QUOTA).indexOf(a.provider) - Object.keys(MEDIA_QUOTA).indexOf(b.provider))
    .filter((candidate) => {
      used[candidate.provider] = (used[candidate.provider] ?? 0) + 1;
      return used[candidate.provider] <= MEDIA_QUOTA[candidate.provider];
    });
}

async function seedDraftPlace(conn: TiDbConnection, place: HanoiPlace, now: Date): Promise<boolean> {
  const cost = parseCostRange(place.costText);
  const search = buildPlaceSearchFields({ ...place, tags: [] });
  const result = await conn.execute(
    `INSERT IGNORE INTO places
      (id, slug, name, search_name, search_text, city, area, address, lat, lng, category, price_level,
       est_cost_min, est_cost_max, moods, tags, indoor, cover_url, summary, opening_hours, status, view_count,
       created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'hanoi', ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', ?, '', ?, NULL, 'draft', 0, ?, ?)`,
    [
      place.id,
      place.slug,
      place.name,
      search.searchName,
      search.searchText,
      place.area,
      `${place.area}${HANOI_SUFFIX}`,
      (place.lat ?? 0).toFixed(6),
      (place.lng ?? 0).toFixed(6),
      place.category,
      place.priceLevel,
      cost.min,
      cost.max,
      JSON.stringify(place.moods),
      place.indoor,
      place.summary,
      now,
      now,
    ],
    { fullResult: true }
  );

  await conn.execute(
    `INSERT IGNORE INTO place_guides
      (place_id, best_times, best_weekdays, avoid_weekdays, best_seasons, crowd_notes, photo_spots, poses, outfit, tips, source_links)
     VALUES (?, '[]', '[]', '[]', '[]', ?, ?, ?, ?, ?, '[]')`,
    [
      place.id,
      `Nên đi: ${place.bestWeekdays}. Nên tránh: ${place.avoidWeekdays}.`,
      JSON.stringify(place.photoSpots),
      JSON.stringify(place.poses),
      JSON.stringify(place.outfit),
      JSON.stringify(place.tips),
    ]
  );
  return (result.rowsAffected ?? 0) > 0;
}

type TrackResult = "tracked" | "quota_exhausted";

/** Điều khoản Unsplash: báo lượt "download" khi ảnh được chọn dùng trong app. */
async function trackUnsplashDownload(trackUrl: string, accessKey: string): Promise<TrackResult> {
  const response = await fetch(trackUrl, {
    headers: { Authorization: `Client-ID ${accessKey}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (response.status === 403 || response.status === 429) return "quota_exhausted";
  if (!response.ok) throw new Error(`Unsplash tracking HTTP ${response.status}`);
  const remaining = Number(response.headers.get("x-ratelimit-remaining") ?? MIN_UNSPLASH_REMAINING + 1);
  return remaining < MIN_UNSPLASH_REMAINING ? "quota_exhausted" : "tracked";
}

async function insertMedia(conn: TiDbConnection, placeId: string, candidate: Candidate, sortOrder: number): Promise<void> {
  await conn.execute(
    `INSERT INTO place_media
      (id, place_id, type, url, platform, embed_id, caption, credit, license, sort_order, source_url, license_note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      toMediaId(placeId, candidate.url),
      placeId,
      candidate.type,
      candidate.url,
      candidate.platform,
      candidate.embedId,
      candidate.caption.slice(0, 200),
      candidate.credit.slice(0, 200),
      candidate.license,
      sortOrder,
      candidate.sourcePage,
      candidate.licenseNote.slice(0, 300),
    ]
  );
}

async function loadExistingMediaIds(conn: TiDbConnection, placeId: string): Promise<Set<string>> {
  const rows = (await conn.execute("SELECT id FROM place_media WHERE place_id = ?", [placeId])) as { id: string }[];
  return new Set(rows.map((row) => row.id));
}

async function importPlaceMedia(
  conn: TiDbConnection,
  place: HanoiPlace,
  candidates: Candidate[],
  stats: ImportStats,
  unsplash: { accessKey: string | undefined; exhausted: boolean }
): Promise<void> {
  const existingIds = await loadExistingMediaIds(conn, place.id);
  let sortOrder = existingIds.size;
  let coverUrl: string | null = null;

  for (const candidate of selectMedia(candidates)) {
    if (existingIds.has(toMediaId(place.id, candidate.url))) {
      stats.skippedExisting += 1;
      coverUrl ??= candidate.url;
      continue;
    }
    if (candidate.provider === "unsplash") {
      if (!unsplash.accessKey || !candidate.trackDownloadUrl || unsplash.exhausted) {
        stats.unsplashDeferred += 1;
        continue;
      }
      if ((await trackUnsplashDownload(candidate.trackDownloadUrl, unsplash.accessKey)) === "quota_exhausted") {
        unsplash.exhausted = true;
        stats.unsplashDeferred += 1;
        continue;
      }
    }
    await insertMedia(conn, place.id, candidate, sortOrder++);
    stats.insertedMedia += 1;
    coverUrl ??= candidate.url;
  }

  if (!coverUrl) return;
  const result = await conn.execute("UPDATE places SET cover_url = ?, updated_at = ? WHERE id = ? AND cover_url = ''", [
    coverUrl,
    new Date(),
    place.id,
  ], { fullResult: true });
  stats.coversSet += result.rowsAffected ?? 0;
}

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Chưa có DATABASE_URL trong .env");

  const file = JSON.parse(readFileSync(CANDIDATES_FILE, "utf8")) as CandidatesFile;
  const candidatesBySlug = new Map(file.places.map((entry) => [entry.slug, entry.candidates]));
  const conn = connect({ url });
  const stats: ImportStats = { seededPlaces: 0, insertedMedia: 0, skippedExisting: 0, coversSet: 0, unsplashDeferred: 0 };
  const unsplash = { accessKey: process.env.UNSPLASH_ACCESS_KEY, exhausted: false };
  const now = new Date();

  for (const place of HANOI_PLACES.filter((candidate) => candidate.status === "published")) {
    if (await seedDraftPlace(conn, place, now)) stats.seededPlaces += 1;
    await importPlaceMedia(conn, place, candidatesBySlug.get(place.slug) ?? [], stats, unsplash);
    console.log(`  ${place.slug}: xong`);
  }

  console.log(
    `✓ Seed ${stats.seededPlaces} địa điểm (draft) | thêm ${stats.insertedMedia} media | bỏ qua ${stats.skippedExisting} đã có | đặt ${stats.coversSet} ảnh bìa`
  );
  if (stats.unsplashDeferred > 0) {
    console.log(`⚠ Hoãn ${stats.unsplashDeferred} ảnh Unsplash (hết quota/thiếu key) → chạy lại pnpm media:import sau 1 giờ`);
  }
}

main().catch((error) => {
  console.error(`✗ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
