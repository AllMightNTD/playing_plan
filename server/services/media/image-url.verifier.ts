import sharp from "sharp";

export type ImageCheckFailReason =
  | "http_status"
  | "content_type"
  | "too_large"
  | "too_small"
  | "bad_aspect"
  | "decode_failed"
  | "network";

export type ImageCheck =
  | { ok: true; width: number; height: number; bytes: number; contentType: string }
  | { ok: false; reason: ImageCheckFailReason; httpStatus?: number };

const MIN_WIDTH = 800;
const MIN_HEIGHT = 500;
const MIN_ASPECT = 0.5;
const MAX_ASPECT = 2.5;
const MAX_BYTES = 8 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 8000;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const fail = (reason: ImageCheckFailReason, httpStatus?: number): ImageCheck =>
  httpStatus === undefined ? { ok: false, reason } : { ok: false, reason, httpStatus };

// Tải 1 URL ảnh và kiểm tra có dùng được để hotlink không.
// Không gửi Referer để khớp với FE (referrerPolicy="no-referrer").
export async function verifyImageUrl(
  url: string,
  deps: { fetchImpl?: typeof fetch; timeoutMs?: number } = {}
): Promise<ImageCheck> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const timeoutMs = deps.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  let res: Response;
  try {
    res = await fetchImpl(url, {
      method: "GET",
      redirect: "follow",
      headers: { "user-agent": USER_AGENT, accept: "image/avif,image/webp,image/*,*/*;q=0.8" },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    return fail("network");
  }

  if (res.status < 200 || res.status >= 300) return fail("http_status", res.status);

  // Chỉ lấy media type, bỏ phần tham số sau dấu ";"
  const contentType = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (!ALLOWED_TYPES.has(contentType)) return fail("content_type");

  const declared = Number(res.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BYTES) return fail("too_large");

  let buf: Buffer;
  try {
    buf = Buffer.from(await res.arrayBuffer());
  } catch {
    return fail("network");
  }
  if (buf.byteLength > MAX_BYTES) return fail("too_large");

  let width: number | undefined;
  let height: number | undefined;
  try {
    const meta = await sharp(buf).metadata();
    width = meta.width;
    height = meta.height;
  } catch {
    return fail("decode_failed");
  }
  if (!width || !height) return fail("decode_failed");

  if (width < MIN_WIDTH || height < MIN_HEIGHT) return fail("too_small");
  const aspect = width / height;
  if (aspect < MIN_ASPECT || aspect > MAX_ASPECT) return fail("bad_aspect");

  return { ok: true, width, height, bytes: buf.byteLength, contentType };
}
