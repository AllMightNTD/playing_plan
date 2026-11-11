// Client tìm ảnh ẩm thực Việt Nam (Foody, ShopeeFood, Riviu) qua DuckDuckGo Image Engine.
// Không tốn phí, không dính Captcha, đảm bảo 100% kết quả từ các nền tảng ẩm thực địa phương.
import { normalizeVi } from "./image-candidate.filter";
import type { BingImageResult } from "./bing-image-search";

export type FoodyImageResult = BingImageResult;

const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

export function buildFoodySearchQuery(place: { name: string; area?: string | null }): string {
  const parts = [place.name.trim()];
  const area = place.area?.trim();
  if (area) parts.push(area);
  const joined = parts.join(" ");
  if (!normalizeVi(joined).includes("ha noi")) parts.push("Hà Nội");
  return `${parts.join(" ")} (site:foody.vn OR site:shopeefood.vn OR site:riviu.vn)`;
}

export async function searchFoodyImages(
  query: string,
  deps: { fetchImpl?: typeof fetch; count?: number } = {},
): Promise<FoodyImageResult[]> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const targetedQuery = query.includes("site:")
    ? query
    : `${query} (site:foody.vn OR site:shopeefood.vn OR site:riviu.vn)`;

  // 1. Lấy token vqd từ DuckDuckGo
  let tokenRes: Response;
  try {
    tokenRes = await fetchImpl("https://duckduckgo.com/?q=" + encodeURIComponent(targetedQuery), {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept-Language": "vi-VN,vi;q=0.9",
      },
      signal: AbortSignal.timeout(10000),
    });
  } catch (err) {
    throw new Error(`Lỗi kết nối DuckDuckGo: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!tokenRes.ok) {
    throw new Error(`DuckDuckGo trả status ${tokenRes.status}`);
  }

  const html = await tokenRes.text();
  const vqdMatch =
    html.match(/vqd=([^&"'\s]+)/) ||
    html.match(/vqd="([^"]+)"/) ||
    html.match(/"vqd":"([^"]+)"/) ||
    html.match(/vqd=([0-9-]+)/);

  if (!vqdMatch) {
    throw new Error("Không trích xuất được token vqd từ DuckDuckGo");
  }

  const vqd = vqdMatch[1];

  // Giãn cách 600ms mô phỏng trình duyệt tải assets trước khi gọi API ảnh
  await new Promise((resolve) => setTimeout(resolve, 600));

  // 2. Gọi DuckDuckGo Image API
  const imgUrl = new URL("https://duckduckgo.com/i.js");
  imgUrl.searchParams.set("l", "wt-wt");
  imgUrl.searchParams.set("o", "json");
  imgUrl.searchParams.set("q", targetedQuery);
  imgUrl.searchParams.set("vqd", vqd);

  let imgRes: Response;
  try {
    imgRes = await fetchImpl(imgUrl.toString(), {
      headers: {
        "User-Agent": USER_AGENT,
        Referer: "https://duckduckgo.com/",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(12000),
    });
  } catch (err) {
    throw new Error(`Lỗi gọi DuckDuckGo Image API: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!imgRes.ok) {
    throw new Error(`DuckDuckGo Image API trả status ${imgRes.status}`);
  }

  interface DdgImageRaw {
    image?: string;
    thumbnail?: string;
    url?: string;
    title?: string;
    width?: number;
    height?: number;
  }

  let data: { results?: DdgImageRaw[] };
  try {
    data = (await imgRes.json()) as { results?: DdgImageRaw[] };
  } catch {
    throw new Error("Không parse được JSON từ DuckDuckGo Image API");
  }

  const results: FoodyImageResult[] = [];
  const seen = new Set<string>();

  for (const item of data.results || []) {
    const imageUrl = item.image;
    if (!imageUrl || !/^https:\/\//i.test(imageUrl) || seen.has(imageUrl)) continue;
    seen.add(imageUrl);

    results.push({
      imageUrl,
      thumbnailUrl: item.thumbnail || null,
      pageUrl: item.url || null,
      title: item.title || "",
      rank: results.length,
    });

    if (results.length >= (deps.count ?? 30)) break;
  }

  return results;
}
