import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as fs from "fs";
import { loadCatalogVideos } from "./video-catalog.service";
import { isDatabaseConfigured } from "@/server/db/client";
import { listCatalogRows } from "@/server/db/queries/videos/video-catalog.queries";

vi.mock("@/server/db/client", () => ({ isDatabaseConfigured: vi.fn() }));
vi.mock("@/server/db/queries/videos/video-catalog.queries", () => ({ listCatalogRows: vi.fn(), upsertCatalogRows: vi.fn() }));
vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs")>();
  return { ...actual, existsSync: vi.fn(), readFileSync: vi.fn() };
});

const LOCAL = [{ videoId: "local1", title: "Video cục bộ", channelTitle: "Kênh", isEmbeddable: true }];
const AT = new Date("2026-10-29T03:00:00.000Z");
const ROW = {
  videoId: "db1", title: "Video DB", description: null, channelId: "c", channelTitle: "Kênh", viewCount: 10,
  likeCount: null, commentCount: null, publishedAt: AT, isEmbeddable: true, searchCategory: null, searchLocation: null,
  searchFocus: null, durationSec: 60, aiAnalyzedAt: null, aiAnalysisModel: null, aiAnalysisError: null, importedAt: AT, updatedAt: AT,
};

describe("loadCatalogVideos", () => {
  const env = process.env as Record<string, string | undefined>;
  const originalNodeEnv = env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isDatabaseConfigured).mockReturnValue(true);
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(LOCAL));
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    env.NODE_ENV = originalNodeEnv;
  });

  it("đọc từ bảng video_catalog khi có dữ liệu", async () => {
    vi.mocked(listCatalogRows).mockResolvedValue([ROW]);
    expect((await loadCatalogVideos()).map((v) => v.videoId)).toEqual(["db1"]);
  });

  it("dev: bảng chưa migrate (lỗi) hoặc rỗng thì dùng file cục bộ thay vì trống trang", async () => {
    vi.mocked(listCatalogRows).mockRejectedValue(new Error("Table 'test.video_catalog' doesn't exist"));
    expect((await loadCatalogVideos()).map((v) => v.videoId)).toEqual(["local1"]);

    vi.mocked(listCatalogRows).mockResolvedValue([]);
    expect((await loadCatalogVideos()).map((v) => v.videoId)).toEqual(["local1"]);
  });

  it("production: không đọc file, lỗi DB được ném ra", async () => {
    env.NODE_ENV = "production";
    vi.mocked(listCatalogRows).mockResolvedValue([]);
    expect(await loadCatalogVideos()).toEqual([]);

    vi.mocked(listCatalogRows).mockRejectedValue(new Error("db down"));
    await expect(loadCatalogVideos()).rejects.toThrow("db down");
  });
});
