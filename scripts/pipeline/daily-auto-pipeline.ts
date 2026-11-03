import { loadCatalogVideos } from "@/server/services/videos/video-catalog.service";
import { syncChapterHotspots } from "@/server/services/videos/chapter-hotspots.service";
import { runAiVideoHotspots } from "@/server/services/videos/ai-hotspots.runner";
import {
  resolveRealPhotosDailyLimit,
  runRealPhotoSync,
  type RealPhotoSyncSummary,
} from "@/server/services/media/real-photo-sync.runner";
import * as fs from "fs";
import * as path from "path";
import { db } from "@/server/db/client";
import {
  placeVideos,
  placeBlocklist,
  type PlaceBlocklist,
} from "@/server/db/schema/governance";
import { places, type Place } from "@/server/db/schema/places";
import { YouTubeCoupleReviewCrawler } from "@/server/services/youtube/youtube-couple-crawler";
import { runOsmIngestion } from "./osm-ingest";
import {
  matchVideosWithPlaces,
  type VideoForMatching,
  type PlaceForMatching,
} from "@/server/services/matching/place-video.matcher";
import { autoPublishMatchedVideos } from "@/server/services/pipeline/auto-publish-videos.service";
import { runControlledPromotion } from "@/server/services/pipeline/controlled-rampup.service";
import { runShadowWorker } from "@/server/services/pipeline/shadow-worker";
import { runYoutubeMaintenanceCron } from "./youtube-maintenance-cron";
import { revalidatePlaceCatalog } from "@/server/services/cache/revalidation";
import { eq, sql } from "drizzle-orm";
import { runTrackedPipeline } from "@/server/services/pipeline/pipeline-run.service";
import {
  getPublishPauseState,
  type PublishPauseState,
} from "@/server/services/pipeline/pipeline-control.service";

/**
 * Chạy pipeline hằng ngày và ghi một bản ghi pipeline_runs (running → success/paused/failed)
 * để Radar và badge sức khỏe admin biết lần chạy gần nhất.
 */
export async function runDailyPipeline(
  options: { forceCrawlYoutube?: boolean } = {},
) {
  const pause = await getPublishPauseState();
  return runTrackedPipeline("auto_promote", async () => {
    const report = await executeDailyPipeline(options, pause);
    return {
      result: report,
      status: pause.isPaused ? "paused" : "success",
      promotedCount: report.promotedCount,
      summary: { ...report, publishPaused: pause.isPaused, pauseReason: pause.reason },
    };
  });
}

async function executeDailyPipeline(
  _options: { forceCrawlYoutube?: boolean },
  pause: PublishPauseState,
) {
  const startTime = Date.now();
  console.log(
    "==================================================================",
  );
  console.log(
    "🌟 [DateMate Daily Pipeline] BẮT ĐẦU QUY TRÌNH TỰ ĐỘNG HÀNG NGÀY (03:30 AM)",
  );
  console.log(
    "   Tiêu chí: 100% Free - Chia nhỏ Bounding Box - Batch DB Tốc độ cao",
  );
  console.log(
    "==================================================================",
  );
  if (pause.isPaused) {
    console.warn(
      `⏸️  PHANH PUBLISH ĐANG BẬT (${pause.source}): ${pause.reason ?? "không rõ lý do"}. ` +
        "Vẫn cào và chấm điểm ứng viên, nhưng KHÔNG thăng hạng địa điểm và KHÔNG tự xuất bản video.",
    );
  }

  // 1. Tải Blocklist
  const blocklist: PlaceBlocklist[] = await db.select().from(placeBlocklist);
  console.log(
    `✓ Đã tải ${blocklist.length} quy tắc lọc địa điểm rác (Blocklist).`,
  );

  // 2. GIAI ĐOẠN 1: CÀO OSM BẰNG LƯỚI PHÂN VÙNG CHIA NHỎ (SUBDIVIDED GRID)
  console.log(
    "\n--- [Giai đoạn 1] Cào OpenStreetMap (Lưới chia nhỏ chống nghẽn) ---",
  );
  const osmResult = await runOsmIngestion({
    dryRun: false,
    delayMs: 2000,
    insertToDb: true,
    executor: db,
    subdivideDense: true,
  });
  console.log(
    `=> Đã quét OSM: tìm thấy ${osmResult.qualifyingCandidatesCount} ứng viên đạt chuẩn hẹn hò.`,
  );

  // 3. GIAI ĐOẠN 2: THU THẬP VIDEO REVIEW YOUTUBE (TIẾT KIỆM QUOTA FREE TIER)
  console.log(
    "\n--- [Giai đoạn 2] Đồng bộ Video Review Hẹn hò YouTube (Free Tier Quota) ---",
  );
  let crawledVideosCount = 0;
  try {
    const crawler = new YouTubeCoupleReviewCrawler();
    const crawlMatrix = [
      {
        category: "quán cafe hẹn hò lãng mạn",
        location: "Hà Nội",
        coupleKeywords: ["hẹn hò", "cặp đôi"],
        maxResultsPerQuery: 5,
      },
      {
        category: "quán ăn lãng mạn cho 2 người",
        location: "Hà Nội",
        coupleKeywords: ["hẹn hò", "cho cặp đôi"],
        maxResultsPerQuery: 5,
      },
      {
        category: "địa điểm chill hoàng hôn",
        location: "Hà Nội",
        coupleKeywords: ["cặp đôi", "đi date"],
        maxResultsPerQuery: 5,
      },
      {
        category: "workshop làm gốm vẽ tranh",
        location: "Hà Nội",
        coupleKeywords: ["cặp đôi", "hò hẹn"],
        maxResultsPerQuery: 5,
      },
      {
        category: "glamping cắm trại cuối tuần",
        location: "Hà Nội",
        coupleKeywords: ["cặp đôi", "2 người"],
        maxResultsPerQuery: 5,
      },
      {
        category: "quán cocktail bar nhẹ nhàng",
        location: "Hà Nội",
        coupleKeywords: ["hẹn hò", "chill"],
        maxResultsPerQuery: 5,
      },
    ];
    const vids = await crawler.crawlMatrix(crawlMatrix);
    crawledVideosCount = vids.length;
    console.log(
      `=> Đã cập nhật ${crawledVideosCount} video review mới vào kho dữ liệu.`,
    );
  } catch (err: unknown) {
    console.warn(
      `[YouTube Warning] Bỏ qua cào YouTube (dùng kho video sẵn có): ${err instanceof Error ? err.message : err}`,
    );
  }

  // Stage 3: Evaluate candidate tiers via Shadow Worker, then run atomic Controlled Promotion
  console.log(
    "\n--- [Giai đoạn 3] Thẩm định Shadow Worker & Thăng hạng Ứng viên Nguyên tử ---",
  );
  await runShadowWorker({ batchId: "daily_shadow", executor: db });

  let promotedCount = 0;
  const now = new Date();
  if (!pause.isPaused) {
    const promotionResult = await runControlledPromotion({
      stage: 2,
      batchId: "daily_auto_pipeline",
    });
    promotedCount = promotionResult.promotedCount;
  }
  console.log(
    `=> Đã thăng hạng thành công ${promotedCount} địa điểm mới vào hệ thống.`,
  );

  // 5. GIAI ĐOẠN 4: SO KHỚP VÀ XUẤT BẢN VIDEO REVIEW NHANH (BATCHED)
  console.log(
    "\n--- [Giai đoạn 4] So khớp Video Review & Xuất bản (Batch Mode) ---",
  );
  const rawVideos = await loadCatalogVideos();
  if (rawVideos.length > 0) {
    const allPublishedPlaces: Place[] = await db
      .select()
      .from(places)
      .where(eq(places.status, "published"));

    const targets: PlaceForMatching[] = allPublishedPlaces.map((p) => ({
      id: p.id,
      name: p.name,
      address: p.address,
      district: p.area || p.city,
    }));

    const vidsForMatch: VideoForMatching[] = rawVideos.map((v) => ({
      videoId: v.videoId,
      title: v.title,
      description: v.description,
      channelId: v.channelId,
      channelTitle: v.channelTitle,
      publishedAt: v.publishedAt,
    }));

    const matches = matchVideosWithPlaces(targets, vidsForMatch);
    console.log(
      `=> Tìm thấy ${matches.length} cặp liên kết giữa Video và Tọa độ hẹn hò.`,
    );

    const CHUNK_SIZE = 50;
    for (let mIdx = 0; mIdx < matches.length; mIdx += CHUNK_SIZE) {
      const chunk = matches.slice(mIdx, mIdx + CHUNK_SIZE);
      for (const m of chunk) {
        const vid = vidsForMatch.find((v) => v.videoId === m.videoId);
        const nextVideoStatus =
          !pause.isPaused && m.score >= 65 ? "auto_linked" : "pending_review";
        await db
          .insert(placeVideos)
          .values({
            placeId: m.placeId,
            videoId: m.videoId,
            channelId: vid?.channelId,
            channelTitle: vid?.channelTitle,
            hasPaidPlacement: false,
            confidenceScore: m.score.toFixed(2),
            status: nextVideoStatus,
            publishedAt: vid?.publishedAt ? new Date(vid.publishedAt) : now,
            lastCheckedAt: now,
          })
          .onDuplicateKeyUpdate({
            set: {
              confidenceScore: m.score.toFixed(2),
              status: sql`CASE WHEN ${placeVideos.status} IN ('verified', 'rejected') THEN ${placeVideos.status} ELSE ${nextVideoStatus} END`,
              lastCheckedAt: now,
            },
          });
      }
    }

    const chapterHotspots = await syncChapterHotspots(rawVideos, allPublishedPlaces, !pause.isPaused);
    console.log(`=> Tạo ${chapterHotspots} mốc hotspot từ chapter video.`);

    if (!pause.isPaused) {
      await autoPublishMatchedVideos({
        executor: db,
        minConfidence: 65,
        revalidate: false,
      });
    }
  }

  // 5b. AI xem video tìm mốc địa điểm (trong ngân sách giây video/24h của Gemini)
  console.log("\n--- [Giai đoạn 4b] AI phân tích video tìm mốc địa điểm ---");
  const aiHotspots = await runAiVideoHotspots();
  console.log(
    `=> AI: ${aiHotspots.analyzedVideos} video, ${aiHotspots.verifiedHotspots} mốc tự duyệt, ` +
      `${aiHotspots.pendingHotspots} mốc chờ, dừng vì: ${aiHotspots.stoppedReason}`,
  );

  // 6. GIAI ĐOẠN 5: BẢO TRÌ VIDEO 30 NGÀY
  console.log("\n--- [Giai đoạn 5] Bảo trì định kỳ Video ---");
  await runYoutubeMaintenanceCron({
    daysThreshold: 30,
    batchSize: 50,
    executor: db,
  });

  // 6b. Tìm ảnh thật (Bing) cho địa điểm chưa có — chạy sau video/AI để không giành thời gian của các bước chính.
  // Mặc định TẮT: bật bằng env REAL_PHOTOS_DAILY_LIMIT=<số nguyên dương> (số place mỗi ngày).
  // Rỗng/0/NaN/âm đều là tắt để cron không tự ghi ảnh chưa duyệt lên prod. Lỗi chỉ cảnh báo, không làm hỏng pipeline.
  console.log("\n--- [Giai đoạn 5b] Tìm ảnh thật cho địa điểm ---");
  let realPhotos: RealPhotoSyncSummary | { error: string } | null = null;
  const realPhotosLimit = resolveRealPhotosDailyLimit(process.env.REAL_PHOTOS_DAILY_LIMIT);
  try {
    if (realPhotosLimit === 0) {
      console.log("=> Bước ảnh thật tắt (REAL_PHOTOS_DAILY_LIMIT=0).");
    } else {
      realPhotos = await runRealPhotoSync({ limit: realPhotosLimit });
      console.log(
        `=> Ảnh thật: thay ${realPhotos.replaced} địa điểm, ${realPhotos.needsReview.length} cần duyệt tay` +
          `${realPhotos.blocked ? ", Bing chặn nên dừng sớm" : ""}` +
          `${realPhotos.aborted ? ", lỗi DB liên tiếp nên dừng sớm" : ""}`,
      );
    }
  } catch (err) {
    console.warn("=> Bỏ qua bước ảnh thật do lỗi:", err);
    realPhotos = { error: err instanceof Error ? err.message : String(err) };
  }

  // 7. GIAI ĐOẠN 6: REVALIDATE NEXT.JS CACHE
  console.log("\n--- [Giai đoạn 6] Revalidate Next.js Cache ---");
  try {
    revalidatePlaceCatalog();
    console.log("=> Revalidate cache thành công!");
  } catch {
    // CLI context
  }

  // 8. TỔNG KẾT VÀ GHI BÁO CÁO AUDIT
  const totalPlaces = await db
    .select({ count: sql`count(*)` })
    .from(places)
    .where(eq(places.status, "published"));
  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);

  const report = {
    executedAt: new Date().toISOString(),
    durationSeconds: Number(durationSec),
    candidatesDiscovered: osmResult.qualifyingCandidatesCount,
    promotedCount,
    totalPublishedPlaces: totalPlaces[0]?.count || 0,
    aiHotspots,
    realPhotos,
    costEstimatedUSD: 0.0,
    freeTierCompliance: "100% FREE GUARANTEED",
  };

  const reportPath = path.resolve(
    process.cwd(),
    "scripts/output/pipeline_daily_report.json",
  );
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf-8");

  console.log(
    "\n==================================================================",
  );
  console.log(`🎉 [HOÀN TẤT DAILY PIPELINE] Thời gian: ${durationSec}s`);
  console.log(`   - Địa điểm thăng hạng mới: ${promotedCount}`);
  console.log(
    `   - TỔNG SỐ TỌA ĐỘ HẸN HÒ ĐÃ XUẤT BẢN: ${totalPlaces[0]?.count || 0}`,
  );
  console.log(`   - Chi phí phát sinh: $0.00 (100% Free)`);
  console.log(
    "==================================================================",
  );

  return report;
}

if (require.main === module) {
  runDailyPipeline().catch((err) => {
    console.error("❌ Fatal Error in Daily Pipeline:", err);
    process.exit(1);
  });
}
