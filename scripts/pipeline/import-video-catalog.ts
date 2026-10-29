/**
 * Nạp file kết quả cào cục bộ (mặc định scripts/output/youtube/raw_videos.json) vào bảng video_catalog.
 * Upsert theo video_id nên chạy lại nhiều lần vẫn an toàn.
 * Chạy: pnpm video:import [đường-dẫn-file]
 */
import * as path from "path";
import { runTrackedPipeline } from "@/server/services/pipeline/pipeline-run.service";
import { eq } from "drizzle-orm";
import { db, isDatabaseConfigured } from "@/server/db/client";
import { places } from "@/server/db/schema";
import { syncChapterHotspots } from "@/server/services/videos/chapter-hotspots.service";
import { getPublishPauseState } from "@/server/services/pipeline/pipeline-control.service";
import {
  LOCAL_RAW_VIDEOS_PATH,
  readLocalRawVideos,
  saveCatalogVideos,
} from "@/server/services/videos/video-catalog.service";

async function main() {
  if (!isDatabaseConfigured()) {
    console.error("✗ Chưa có DATABASE_URL trong .env");
    process.exit(1);
  }

  const filePath = process.argv[2] ? path.resolve(process.argv[2]) : LOCAL_RAW_VIDEOS_PATH;
  // Bỏ video mẫu do dry run sinh ra (id dạng mock_*) nếu file cũ còn sót
  const videos = readLocalRawVideos(filePath).filter((v) => !v.videoId.startsWith("mock_"));
  if (videos.length === 0) {
    console.error(`✗ Không có video nào để nạp trong ${filePath}`);
    process.exit(1);
  }

  const saved = await saveCatalogVideos(videos);
  console.log(`✓ Đã upsert ${saved}/${videos.length} video vào video_catalog`);

  const publishedPlaces = await db.select({ id: places.id, name: places.name }).from(places).where(eq(places.status, "published"));
  const pause = await getPublishPauseState();
  const proposed = await syncChapterHotspots(videos, publishedPlaces, !pause.isPaused);
  console.log(`✓ Tạo ${proposed} mốc hotspot từ chapter (${pause.isPaused ? "pending vì đang phanh publish" : "tự duyệt"})`);
  return { summary: { videos: videos.length, saved, chapterHotspots: proposed } };
}

runTrackedPipeline("video_import", async () => {
  const { summary } = await main();
  return { result: undefined, summary };
}).catch((err) => {
  console.error("✗ Nạp video thất bại:", err);
  process.exit(1);
});
