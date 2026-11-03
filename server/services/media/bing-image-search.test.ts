import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  BingBlockedError,
  buildPlaceImageQuery,
  parseBingImageHtml,
  searchBingImages,
} from "./bing-image-search";

const html = readFileSync(join(__dirname, "__fixtures__/bing-async-sample.html"), "utf8");

describe("buildPlaceImageQuery", () => {
  it("ghép tên + khu vực + Hà Nội", () =>
    expect(buildPlaceImageQuery({ name: "Cộng Cà Phê", area: "Hoàn Kiếm" })).toBe("Cộng Cà Phê Hoàn Kiếm Hà Nội"));
  it("không lặp Hà Nội khi tên đã có (không phân biệt dấu)", () =>
    expect(buildPlaceImageQuery({ name: "Lotte Center Ha Noi", area: null })).toBe("Lotte Center Ha Noi"));
  it("bỏ area rỗng", () =>
    expect(buildPlaceImageQuery({ name: "Hồ Gươm", area: "" })).toBe("Hồ Gươm Hà Nội"));
});

describe("parseBingImageHtml", () => {
  it("decode entity, bỏ JSON hỏng, dedupe theo imageUrl, rank liên tục", () => {
    const r = parseBingImageHtml(html);
    expect(r).toHaveLength(3);
    expect(r.map((x) => x.rank)).toEqual([0, 1, 2]);
    expect(r.every((x) => x.imageUrl.startsWith("http"))).toBe(true);
    expect(r.some((x) => x.imageUrl.includes("&amp;"))).toBe(false);
    expect(r.some((x) => x.imageUrl.includes("&h=600"))).toBe(true);
  });
  it("trả [] với HTML không có ảnh", () => expect(parseBingImageHtml("<html></html>")).toEqual([]));
});

describe("searchBingImages", () => {
  it("gửi URL đúng tham số và parse kết quả", async () => {
    const fetchImpl = vi.fn(async (_u: unknown) => new Response(html, { status: 200 }));
    const r = await searchBingImages("Cộng Cà Phê Hà Nội", { fetchImpl: fetchImpl as unknown as typeof fetch, count: 35 });
    const url = new URL(String(fetchImpl.mock.calls[0][0]));
    expect(url.origin + url.pathname).toBe("https://www.bing.com/images/async");
    expect(url.searchParams.get("q")).toBe("Cộng Cà Phê Hà Nội");
    expect(url.searchParams.get("count")).toBe("35");
    expect(url.searchParams.get("qft")).toBe("+filterui:imagesize-large");
    expect(r).toHaveLength(3);
  });
  it("ném BingBlockedError khi status != 200", async () => {
    const fetchImpl = vi.fn(async () => new Response("", { status: 429 }));
    await expect(searchBingImages("x", { fetchImpl })).rejects.toBeInstanceOf(BingBlockedError);
  });
  it("ném BingBlockedError khi 200 nhưng là trang captcha", async () => {
    const fetchImpl = vi.fn(async () => new Response("<html>captcha challenge</html>", { status: 200 }));
    await expect(searchBingImages("x", { fetchImpl })).rejects.toBeInstanceOf(BingBlockedError);
  });
  it("trả [] khi 200, trang bình thường nhưng không có kết quả", async () => {
    const page = "<html>" + "<div>".repeat(1000) + "</html>";
    const fetchImpl = vi.fn(async () => new Response(page, { status: 200 }));
    await expect(searchBingImages("x", { fetchImpl })).resolves.toEqual([]);
  });
});
