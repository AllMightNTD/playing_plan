import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { verifyImageUrl } from "./image-url.verifier";

// Tạo ảnh jpeg thật (màu đơn sắc nên nhẹ)
async function jpeg(width: number, height: number): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: "#f80" } })
    .jpeg()
    .toBuffer();
}

function fakeFetch(buf: Buffer | string, status: number, headers: Record<string, string>) {
  return (async () => new Response(buf as BodyInit, { status, headers })) as unknown as typeof fetch;
}

describe("verifyImageUrl", () => {
  it("ok với jpeg 1200x800", async () => {
    const buf = await jpeg(1200, 800);
    const r = await verifyImageUrl("https://x/a.jpg", {
      fetchImpl: fakeFetch(buf, 200, { "content-type": "image/jpeg" }),
    });
    expect(r).toMatchObject({ ok: true, width: 1200, height: 800 });
    if (r.ok) expect(r.bytes).toBeGreaterThan(0);
  });

  it("content-type có charset vẫn ok", async () => {
    const buf = await jpeg(1200, 800);
    const r = await verifyImageUrl("https://x/a.jpg", {
      fetchImpl: fakeFetch(buf, 200, { "content-type": "image/jpeg; charset=binary" }),
    });
    expect(r.ok).toBe(true);
  });

  it("404 → http_status", async () => {
    const r = await verifyImageUrl("https://x/a.jpg", {
      fetchImpl: fakeFetch("nope", 404, { "content-type": "text/html" }),
    });
    expect(r).toEqual({ ok: false, reason: "http_status", httpStatus: 404 });
  });

  it("trả HTML (chặn hotlink) → content_type", async () => {
    const r = await verifyImageUrl("https://x/a.jpg", {
      fetchImpl: fakeFetch("<html></html>", 200, { "content-type": "text/html" }),
    });
    expect(r).toMatchObject({ ok: false, reason: "content_type" });
  });

  it("content-length > 8MB bỏ trước khi đọc body", async () => {
    const buf = await jpeg(1200, 800);
    const r = await verifyImageUrl("https://x/a.jpg", {
      fetchImpl: fakeFetch(buf, 200, { "content-type": "image/jpeg", "content-length": "9000000" }),
    });
    expect(r).toMatchObject({ ok: false, reason: "too_large" });
  });

  it("ảnh nhỏ 640x480 → too_small", async () => {
    const buf = await jpeg(640, 480);
    const r = await verifyImageUrl("https://x/a.jpg", {
      fetchImpl: fakeFetch(buf, 200, { "content-type": "image/jpeg" }),
    });
    expect(r).toMatchObject({ ok: false, reason: "too_small" });
  });

  it("ảnh siêu ngang 3000x900 → bad_aspect", async () => {
    const buf = await jpeg(3000, 900);
    const r = await verifyImageUrl("https://x/a.jpg", {
      fetchImpl: fakeFetch(buf, 200, { "content-type": "image/jpeg" }),
    });
    expect(r).toMatchObject({ ok: false, reason: "bad_aspect" });
  });

  it("bytes rác image/png → decode_failed", async () => {
    const r = await verifyImageUrl("https://x/a.png", {
      fetchImpl: fakeFetch(Buffer.from("not an image"), 200, { "content-type": "image/png" }),
    });
    expect(r).toMatchObject({ ok: false, reason: "decode_failed" });
  });

  it("fetch throw → network", async () => {
    const r = await verifyImageUrl("https://x/a.jpg", {
      fetchImpl: (async () => {
        throw new Error("boom");
      }) as unknown as typeof fetch,
    });
    expect(r).toEqual({ ok: false, reason: "network" });
  });

  it("http:// → unsafe_url, không gọi fetch", async () => {
    let called = false;
    const r = await verifyImageUrl("http://x.vn/a.jpg", {
      fetchImpl: (async () => {
        called = true;
        return new Response("", { status: 200 });
      }) as unknown as typeof fetch,
    });
    expect(r).toEqual({ ok: false, reason: "unsafe_url" });
    expect(called).toBe(false);
  });

  it.each(["https://127.0.0.1/x.jpg", "https://localhost/x.jpg", "https://printer.local/x.jpg", "https://[::1]/x.jpg"])(
    "host nội bộ/IP %s → unsafe_url",
    async (url) => {
      const fetchImpl = vi.fn();
      const r = await verifyImageUrl(url, { fetchImpl: fetchImpl as unknown as typeof fetch });
      expect(r).toEqual({ ok: false, reason: "unsafe_url" });
      expect(fetchImpl).not.toHaveBeenCalled();
    },
  );

  it("redirect sang http → unsafe_url", async () => {
    const buf = await jpeg(1200, 800);
    const r = await verifyImageUrl("https://x.vn/a.jpg", {
      fetchImpl: (async () => {
        const res = new Response(buf as unknown as BodyInit, { status: 200, headers: { "content-type": "image/jpeg" } });
        Object.defineProperty(res, "url", { value: "http://x.vn/a.jpg" });
        return res;
      }) as unknown as typeof fetch,
    });
    expect(r).toEqual({ ok: false, reason: "unsafe_url" });
  });

  it("redirect sang IP nội bộ → unsafe_url", async () => {
    const buf = await jpeg(1200, 800);
    const r = await verifyImageUrl("https://x.vn/a.jpg", {
      fetchImpl: (async () => {
        const res = new Response(buf as unknown as BodyInit, { status: 200, headers: { "content-type": "image/jpeg" } });
        Object.defineProperty(res, "url", { value: "https://10.0.0.5/a.jpg" });
        return res;
      }) as unknown as typeof fetch,
    });
    expect(r).toEqual({ ok: false, reason: "unsafe_url" });
  });

  it("content_type kèm media type bị từ chối", async () => {
    const r = await verifyImageUrl("https://x/a.jpg", {
      fetchImpl: fakeFetch("<html></html>", 200, { "content-type": "text/html; charset=utf-8" }),
    });
    expect(r).toEqual({ ok: false, reason: "content_type", contentType: "text/html" });
  });

  it("không gửi Referer", async () => {
    const buf = await jpeg(1200, 800);
    let seen: RequestInit | undefined;
    await verifyImageUrl("https://x/a.jpg", {
      fetchImpl: (async (_u: unknown, init?: RequestInit) => {
        seen = init;
        return new Response(buf as unknown as BodyInit, { status: 200, headers: { "content-type": "image/jpeg" } });
      }) as unknown as typeof fetch,
    });
    const keys = Object.keys((seen?.headers ?? {}) as Record<string, string>).map((k) => k.toLowerCase());
    expect(keys).not.toContain("referer");
  });
});
