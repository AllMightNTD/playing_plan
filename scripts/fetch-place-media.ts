/**
 * Gom ứng viên ảnh/video minh họa cho các địa điểm seed, CHỈ từ nguồn được phép dùng lại (mục 2.6, 8.3):
 *  - Wikimedia Commons: ảnh quanh tọa độ, chỉ giữ giấy phép CC0 / Public domain / CC BY / CC BY-SA. Không cần key.
 *  - Unsplash, Pexels: chỉ chạy khi có UNSPLASH_ACCESS_KEY / PEXELS_API_KEY (đăng ký free, không cần thẻ).
 *  - TikTok / YouTube: chỉ nhúng (license embed_only). Link do admin tự chọn trong scripts/data/video-links.json,
 *    script gọi oEmbed chính thức để lấy embed_id, tác giả, tiêu đề. Không cào, không tải video về.
 *
 *  - Ảnh tự chọn (giai đoạn nội bộ v1.3): link ảnh admin tự tìm (ví dụ trên Google Images bằng trình duyệt)
 *    dán vào scripts/data/image-links.json. Chưa rõ bản quyền → license "unverified" + internalOnly,
 *    không được import vào place_media công khai; thay bằng Unsplash/Pexels khi có key.
 *
 * Kết quả ghi ra scripts/output/place-media-candidates.json để admin duyệt; script không ghi DB.
 * --download tải ảnh tự chọn về scripts/output/images/<slug>/ (đã gitignore) để xem/dùng nội bộ.
 *
 * Chạy: pnpm media:fetch [--only=slug1,slug2] [--radius=800] [--download]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { HANOI_PLACES } from "../lib/mock-data.ts";
import type { HanoiPlace } from "../lib/types/catalog.ts";

type Platform = "upload" | "tiktok" | "youtube" | "unsplash" | "pexels" | "wikimedia";
type License = "cc0" | "licensed" | "embed_only" | "unverified";

interface MediaCandidate {
  provider: "wikimedia" | "unsplash" | "pexels" | "tiktok" | "youtube" | "manual";
  type: "image" | "video";
  platform: Platform;
  license: License;
  licenseNote: string;
  url: string;
  embedId: string | null;
  sourcePage: string;
  caption: string;
  credit: string;
  width: number | null;
  height: number | null;
  /** Ảnh chưa rõ bản quyền: chỉ dùng nội bộ, không xuất bản. */
  internalOnly?: true;
  localFile?: string;
  /** Unsplash: phải gọi URL này (kèm Client-ID) khi ảnh thật sự được chọn dùng trong app. */
  trackDownloadUrl?: string;
}

interface PlaceCandidates {
  slug: string;
  name: string;
  candidates: MediaCandidate[];
  /** Số ảnh Commons tìm thấy quanh tọa độ và lý do bị loại, để biết vì sao một nơi ít ảnh. */
  wikimediaStats: Record<string, number>;
  errors: string[];
}

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE = join(SCRIPT_DIR, "output", "place-media-candidates.json");
const VIDEO_LINKS_FILE = join(SCRIPT_DIR, "data", "video-links.json");
const IMAGE_LINKS_FILE = join(SCRIPT_DIR, "data", "image-links.json");
/** Query tiếng Anh theo slug: Unsplash/Pexels tìm tên tiếng Việt có dấu rất kém. */
const STOCK_QUERIES_FILE = join(SCRIPT_DIR, "data", "stock-queries.json");
const IMAGES_DIR = join(SCRIPT_DIR, "output", "images");

const USER_AGENT = `DateMateMediaScript/0.1 (${process.env.MEDIA_FETCH_CONTACT ?? "local development"})`;
const REQUEST_GAP_MS = 400;
const REQUEST_TIMEOUT_MS = 15_000;
const DEFAULT_RADIUS_M = 800;
const MAX_WIKIMEDIA_RESULTS = 6;
const MAX_STOCK_RESULTS = 4;
const MIN_IMAGE_WIDTH = 800;
const THUMB_WIDTH = 1280;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
/** Giấy phép cho phép dùng lại thương mại khi ghi công tác giả; bỏ qua NC/ND và "fair use". */
const ALLOWED_LICENSE = /^(cc0|public domain|pd|cc[ -]by(-sa)?[ -]?\d(\.\d)?)/i;
const VIDEO_HOSTS: Record<string, "tiktok" | "youtube"> = {
  "tiktok.com": "tiktok",
  "www.tiktok.com": "tiktok",
  "vm.tiktok.com": "tiktok",
  "youtube.com": "youtube",
  "www.youtube.com": "youtube",
  "m.youtube.com": "youtube",
  "youtu.be": "youtube",
};

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
  await wait(REQUEST_GAP_MS);
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json", ...headers },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} ${new URL(url).hostname}`);
  return (await response.json()) as T;
}

function stripHtml(value: string | undefined): string {
  return (value ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

interface CliOptions {
  only: Set<string> | null;
  radius: number;
  download: boolean;
}

function parseArgs(argv: string[]): CliOptions {
  const read = (name: string) => argv.find((arg) => arg.startsWith(`--${name}=`))?.split("=")[1];
  const only = read("only");
  return {
    only: only ? new Set(only.split(",").map((slug) => slug.trim())) : null,
    radius: Number(read("radius") ?? DEFAULT_RADIUS_M),
    download: argv.includes("--download"),
  };
}

// ---------- Wikimedia Commons ----------

interface CommonsResponse {
  error?: { code: string; info: string };
  query?: {
    pages?: Record<
      string,
      {
        index: number;
        title: string;
        imageinfo?: {
          thumburl?: string;
          thumbwidth?: number;
          thumbheight?: number;
          width: number;
          mime: string;
          descriptionurl: string;
          extmetadata?: Record<string, { value?: string }>;
        }[];
      }
    >;
  };
}

function toCommonsLicense(shortName: string): License {
  return /^(cc0|public domain|pd)/i.test(shortName) ? "cc0" : "licensed";
}

function rejectReason(info: { thumburl?: string; width: number; mime: string } | undefined, licenseName: string): string | null {
  if (!info?.thumburl) return "no_image_info";
  if (!ALLOWED_MIME.has(info.mime)) return "mime";
  if (info.width < MIN_IMAGE_WIDTH) return "too_small";
  if (!ALLOWED_LICENSE.test(licenseName)) return `license:${licenseName || "unknown"}`;
  return null;
}

async function fetchWikimedia(place: HanoiPlace, radius: number, stats: Record<string, number>): Promise<MediaCandidate[]> {
  if (place.lat === undefined || place.lng === undefined) return [];
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    generator: "geosearch",
    ggscoord: `${place.lat}|${place.lng}`,
    ggsradius: String(Math.min(radius, 10_000)),
    ggsnamespace: "6",
    ggslimit: "30",
    prop: "imageinfo",
    iiprop: "url|size|mime|extmetadata",
    iiurlwidth: String(THUMB_WIDTH),
    origin: "*",
  });
  const data = await fetchJson<CommonsResponse>(`https://commons.wikimedia.org/w/api.php?${params}`);

  if (data.error) throw new Error(`Commons ${data.error.code}: ${data.error.info}`);
  const pages = Object.values(data.query?.pages ?? {});
  stats.found = pages.length;

  return pages
    .sort((a, b) => a.index - b.index)
    .flatMap((page) => {
      const info = page.imageinfo?.[0];
      const meta = info?.extmetadata ?? {};
      const licenseName = stripHtml(meta.LicenseShortName?.value);
      const reason = rejectReason(info, licenseName);
      if (reason || !info?.thumburl) {
        stats[reason ?? "no_image_info"] = (stats[reason ?? "no_image_info"] ?? 0) + 1;
        return [];
      }

      return [
        {
          provider: "wikimedia" as const,
          type: "image" as const,
          platform: "wikimedia" as const,
          license: toCommonsLicense(licenseName),
          licenseNote: `${licenseName} ${stripHtml(meta.LicenseUrl?.value)}`.trim(),
          url: info.thumburl,
          embedId: null,
          sourcePage: info.descriptionurl,
          caption: stripHtml(meta.ImageDescription?.value).slice(0, 200) || page.title.replace(/^File:/, ""),
          credit: `${stripHtml(meta.Artist?.value) || "Không rõ tác giả"} / Wikimedia Commons`.slice(0, 200),
          width: info.thumbwidth ?? null,
          height: info.thumbheight ?? null,
        },
      ];
    })
    .slice(0, MAX_WIKIMEDIA_RESULTS);
}

// ---------- Unsplash / Pexels ----------

const stockQueries: Record<string, string> = existsSync(STOCK_QUERIES_FILE)
  ? (JSON.parse(readFileSync(STOCK_QUERIES_FILE, "utf8")) as Record<string, string>)
  : {};

/** Không import được lib/search.ts (alias "@/" không chạy dưới Node thuần) nên bỏ dấu tại chỗ. */
function stripVietnameseAccents(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").replace(/[^\w\s]/g, " ");
}

function toStockQuery(place: HanoiPlace): string {
  return stockQueries[place.slug] ?? `${stripVietnameseAccents(place.name).replace(/\s+/g, " ").trim()} Hanoi`;
}

interface UnsplashResponse {
  results: {
    id: string;
    width: number;
    height: number;
    alt_description: string | null;
    urls: { regular: string };
    links: { html: string; download_location: string };
    user: { name: string };
  }[];
}

/** Điều khoản Unsplash: hotlink đúng URL của họ và ghi công "Ảnh: <tác giả> / Unsplash". */
async function fetchUnsplash(place: HanoiPlace): Promise<MediaCandidate[]> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return [];
  const params = new URLSearchParams({ query: toStockQuery(place), per_page: String(MAX_STOCK_RESULTS) });
  const data = await fetchJson<UnsplashResponse>(`https://api.unsplash.com/search/photos?${params}`, {
    Authorization: `Client-ID ${key}`,
  });
  return data.results.map((photo) => ({
    provider: "unsplash",
    type: "image",
    platform: "unsplash",
    license: "licensed",
    licenseNote: "Unsplash License (hotlink, ghi công tác giả)",
    url: photo.urls.regular,
    embedId: photo.id,
    sourcePage: photo.links.html,
    caption: (photo.alt_description ?? place.name).slice(0, 200),
    credit: `${photo.user.name} / Unsplash`.slice(0, 200),
    width: photo.width,
    height: photo.height,
    trackDownloadUrl: photo.links.download_location,
  }));
}

interface PexelsResponse {
  photos: { id: number; width: number; height: number; url: string; alt: string; photographer: string; src: { large2x: string } }[];
}

async function fetchPexels(place: HanoiPlace): Promise<MediaCandidate[]> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return [];
  const params = new URLSearchParams({ query: toStockQuery(place), per_page: String(MAX_STOCK_RESULTS) });
  const data = await fetchJson<PexelsResponse>(`https://api.pexels.com/v1/search?${params}`, { Authorization: key });
  return data.photos.map((photo) => ({
    provider: "pexels",
    type: "image",
    platform: "pexels",
    license: "licensed",
    licenseNote: "Pexels License (ghi công tác giả)",
    url: photo.src.large2x,
    embedId: String(photo.id),
    sourcePage: photo.url,
    caption: (photo.alt || place.name).slice(0, 200),
    credit: `${photo.photographer} / Pexels`.slice(0, 200),
    width: photo.width,
    height: photo.height,
  }));
}

// ---------- Ảnh tự chọn (nội bộ) ----------

const MAX_DOWNLOAD_BYTES = 8 * 1024 * 1024;
const IMAGE_EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

function readLinksFile(filePath: string): Record<string, string[]> {
  if (!existsSync(filePath)) return {};
  return JSON.parse(readFileSync(filePath, "utf8")) as Record<string, string[]>;
}

function toManualImageCandidate(place: HanoiPlace, link: string): MediaCandidate {
  const url = new URL(link);
  if (url.protocol !== "https:") throw new Error(`Chỉ nhận link https: ${link}`);
  return {
    provider: "manual",
    type: "image",
    platform: "upload",
    license: "unverified",
    licenseNote: "Chưa rõ bản quyền - chỉ dùng nội bộ, thay bằng ảnh có giấy phép trước khi public",
    url: link,
    embedId: null,
    sourcePage: link,
    caption: place.name,
    credit: url.hostname,
    width: null,
    height: null,
    internalOnly: true,
  };
}

async function downloadImage(candidate: MediaCandidate, slug: string, index: number): Promise<string> {
  await wait(REQUEST_GAP_MS);
  const response = await fetch(candidate.url, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const contentType = response.headers.get("content-type")?.split(";")[0] ?? "";
  const extension = IMAGE_EXTENSIONS[contentType];
  if (!response.ok || !extension) throw new Error(`Bỏ qua ${candidate.url} (HTTP ${response.status}, ${contentType || "?"})`);

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > MAX_DOWNLOAD_BYTES) throw new Error(`Bỏ qua ${candidate.url} (quá ${MAX_DOWNLOAD_BYTES} byte)`);

  const directory = join(IMAGES_DIR, slug);
  mkdirSync(directory, { recursive: true });
  const filePath = join(directory, `manual-${index + 1}.${extension}`);
  writeFileSync(filePath, bytes);
  return filePath;
}

async function downloadInternalImages(result: PlaceCandidates): Promise<void> {
  const internal = result.candidates.filter((candidate) => candidate.internalOnly);
  for (const [index, candidate] of internal.entries()) {
    try {
      candidate.localFile = await downloadImage(candidate, result.slug, index);
    } catch (error) {
      result.errors.push(`download: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// ---------- TikTok / YouTube (chỉ nhúng) ----------

interface OEmbedResponse {
  title?: string;
  author_name?: string;
  thumbnail_url?: string;
}

/** Mục 3.5: chỉ nhận link thuộc domain allowlist. */
function toVideoPlatform(link: string): "tiktok" | "youtube" | null {
  try {
    return VIDEO_HOSTS[new URL(link).hostname] ?? null;
  } catch {
    return null;
  }
}

function extractEmbedId(platform: "tiktok" | "youtube", link: string): string | null {
  const url = new URL(link);
  if (platform === "tiktok") return url.pathname.match(/\/video\/(\d+)/)?.[1] ?? null;
  if (url.hostname === "youtu.be") return url.pathname.slice(1) || null;
  return url.searchParams.get("v") ?? url.pathname.match(/\/shorts\/([\w-]+)/)?.[1] ?? null;
}

async function fetchVideoEmbed(link: string): Promise<MediaCandidate> {
  const platform = toVideoPlatform(link);
  if (!platform) throw new Error(`Link ngoài allowlist: ${link}`);

  const endpoint =
    platform === "tiktok"
      ? `https://www.tiktok.com/oembed?url=${encodeURIComponent(link)}`
      : `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(link)}`;
  const data = await fetchJson<OEmbedResponse>(endpoint);

  return {
    provider: platform,
    type: "video",
    platform,
    license: "embed_only",
    licenseNote: "Chỉ nhúng bằng iframe chính thức, không tải về",
    url: link,
    embedId: extractEmbedId(platform, link),
    sourcePage: link,
    caption: (data.title ?? "").slice(0, 200),
    credit: `${data.author_name ?? "Không rõ"} / ${platform === "tiktok" ? "TikTok" : "YouTube"}`.slice(0, 200),
    width: null,
    height: null,
  };
}

// ---------- Orchestrator ----------

interface PlaceLinks {
  videos: string[];
  images: string[];
}

async function collectForPlace(place: HanoiPlace, options: CliOptions, links: PlaceLinks): Promise<PlaceCandidates> {
  const result: PlaceCandidates = { slug: place.slug, name: place.name, candidates: [], wikimediaStats: {}, errors: [] };
  const sources: [string, () => Promise<MediaCandidate[]>][] = [
    ["wikimedia", () => fetchWikimedia(place, options.radius, result.wikimediaStats)],
    ["unsplash", () => fetchUnsplash(place)],
    ["pexels", () => fetchPexels(place)],
    ...links.images.map((link): [string, () => Promise<MediaCandidate[]>] => [link, async () => [toManualImageCandidate(place, link)]]),
    ...links.videos.map((link): [string, () => Promise<MediaCandidate[]>] => [link, async () => [await fetchVideoEmbed(link)]]),
  ];

  // Tuần tự từng nguồn để không dồn request vào API miễn phí.
  for (const [source, load] of sources) {
    try {
      result.candidates.push(...(await load()));
    } catch (error) {
      result.errors.push(`${source}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (options.download) await downloadInternalImages(result);
  return result;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const videoLinks = readLinksFile(VIDEO_LINKS_FILE);
  const imageLinks = readLinksFile(IMAGE_LINKS_FILE);
  const places = HANOI_PLACES.filter(
    (place) => place.status === "published" && (!options.only || options.only.has(place.slug))
  );

  console.log(
    `→ ${places.length} địa điểm | Unsplash: ${process.env.UNSPLASH_ACCESS_KEY ? "bật" : "tắt"} | Pexels: ${
      process.env.PEXELS_API_KEY ? "bật" : "tắt"
    } | ảnh tự chọn: ${Object.values(imageLinks).flat().length} | link video: ${Object.values(videoLinks).flat().length}`
  );

  const results: PlaceCandidates[] = [];
  for (const place of places) {
    const collected = await collectForPlace(place, options, {
      videos: videoLinks[place.slug] ?? [],
      images: imageLinks[place.slug] ?? [],
    });
    results.push(collected);
    const errorNote = collected.errors.length > 0 ? ` (${collected.errors.length} lỗi)` : "";
    const internalCount = collected.candidates.filter((candidate) => candidate.internalOnly).length;
    console.log(
      `  ${place.slug}: ${collected.candidates.length} ứng viên (nội bộ ${internalCount})${errorNote} | commons ${JSON.stringify(
        collected.wikimediaStats
      )}`
    );
  }

  mkdirSync(dirname(OUTPUT_FILE), { recursive: true });
  writeFileSync(
    OUTPUT_FILE,
    JSON.stringify({ generatedAt: new Date().toISOString(), status: "pending_review", places: results }, null, 2)
  );
  console.log(`✓ Ghi ${results.reduce((sum, r) => sum + r.candidates.length, 0)} ứng viên vào ${OUTPUT_FILE}`);
}

main().catch((error) => {
  console.error(`✗ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
