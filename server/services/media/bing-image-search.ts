// Client tìm ảnh Bing Images (endpoint async) + parser HTML.
// Không dùng API chính thức: parse thuộc tính m="{...}" của thẻ <a class="iusc">.

export interface BingImageResult {
  imageUrl: string; // m.murl
  thumbnailUrl: string | null; // m.turl
  pageUrl: string | null; // m.purl
  title: string; // m.t ?? ""
  rank: number; // vị trí 0-based sau khi dedupe
}

/** Bing chặn / trả captcha / lỗi mạng: caller nên dừng cả batch. */
export class BingBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BingBlockedError";
  }
}

const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

// Tạm thời: bỏ dấu tiếng Việt, Task 3 sẽ thay bằng normalizeVi
function stripVi(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function buildPlaceImageQuery(place: { name: string; area?: string | null }): string {
  const parts = [place.name.trim()];
  const area = place.area?.trim();
  if (area) parts.push(area);
  const joined = parts.join(" ");
  // Không lặp "Hà Nội" nếu tên/khu vực đã có
  if (!stripVi(joined).includes("ha noi")) parts.push("Hà Nội");
  return parts.join(" ");
}

function decodeEntities(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&"); // &amp; decode cuối để tránh decode đôi
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

export function parseBingImageHtml(html: string): BingImageResult[] {
  const results: BingImageResult[] = [];
  const seen = new Set<string>();
  for (const match of html.matchAll(/\sm="(\{[^"]*\})"/g)) {
    let meta: Record<string, unknown>;
    try {
      meta = JSON.parse(decodeEntities(match[1]));
    } catch {
      continue; // JSON hỏng thì bỏ qua
    }
    const imageUrl = str(meta.murl);
    if (!imageUrl || !/^https?:\/\//i.test(imageUrl) || seen.has(imageUrl)) continue;
    seen.add(imageUrl);
    results.push({
      imageUrl,
      thumbnailUrl: str(meta.turl),
      pageUrl: str(meta.purl),
      title: str(meta.t) ?? "",
      rank: results.length,
    });
  }
  return results;
}

export async function searchBingImages(
  query: string,
  deps: { fetchImpl?: typeof fetch; count?: number } = {},
): Promise<BingImageResult[]> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const url = new URL("https://www.bing.com/images/async");
  url.searchParams.set("q", query);
  url.searchParams.set("first", "0");
  url.searchParams.set("count", String(deps.count ?? 35));
  url.searchParams.set("mmasync", "1");
  url.searchParams.set("setlang", "vi");
  url.searchParams.set("cc", "VN");
  url.searchParams.set("qft", "+filterui:imagesize-large");

  let res: Response;
  let html: string;
  try {
    res = await fetchImpl(url.toString(), {
      headers: { "User-Agent": USER_AGENT, "Accept-Language": "vi-VN,vi;q=0.9" },
      signal: AbortSignal.timeout(10000),
    });
    if (res.status !== 200) throw new BingBlockedError(`Bing trả status ${res.status}`);
    html = await res.text();
  } catch (e) {
    if (e instanceof BingBlockedError) throw e;
    throw new BingBlockedError(`Lỗi mạng/timeout khi gọi Bing: ${(e as Error).message}`);
  }

  const results = parseBingImageHtml(html);
  if (results.length === 0 && (html.toLowerCase().includes("captcha") || html.length < 2000)) {
    throw new BingBlockedError("Bing trả trang captcha hoặc rỗng");
  }
  return results;
}
