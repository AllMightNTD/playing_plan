import { runTrackedPipeline } from "@/server/services/pipeline/pipeline-run.service";
import { db } from "@/server/db/client";
import {
  candidatePlaces,
  placeVideos,
  placeBlocklist,
  PlaceBlocklist,
  CandidatePlace,
  PlaceVideo,
} from "@/server/db/schema/governance";
import { places, placeMedia, Place } from "@/server/db/schema/places";
import { YouTubeCoupleReviewCrawler } from "@/server/services/youtube/youtube-couple-crawler";
import { runOsmIngestion } from "./osm-ingest";
import { matchVideosWithPlaces, VideoForMatching, PlaceForMatching } from "@/server/services/matching/place-video.matcher";
import { enrichPlaceWithAi } from "@/server/services/ai/ai-enrichment.service";
import {
  evaluateCandidateForPromotion,
  promoteCandidateToPlace,
} from "@/server/services/ingest/promotion.gatekeeper";
import { autoPublishMatchedVideos } from "@/server/services/pipeline/auto-publish-videos.service";
import { runYoutubeMaintenanceCron } from "./youtube-maintenance-cron";
import { revalidatePlaceCatalog } from "@/server/services/cache/revalidation";
import { eq, inArray } from "drizzle-orm";

/**
 * QUY TRÌNH CRON TỰ ĐỘNG HÓA TOÀN TRÌNH (END-TO-END AUTOMATED PIPELINE)
 * 
 * Kiến trúc phân tầng 6 giai đoạn (Stages):
 * - Stage 1: Ingestion (YouTube Channel Sync + OSM Candidate Ingest + Hooks ảnh/metadata tương lai)
 * - Stage 2: Cross-Matching (So khớp Đa-Đối-Đa giữa Video và Địa điểm)
 * - Stage 3: Auto-Publishing Video Media (Tự động xuất bản video ra place_media cho Web End-User)
 * - Stage 4: Promotion Gatekeeper (Thẩm định thăng hạng Candidate lên Official Place)
 * - Stage 5: Maintenance (Bảo trì định kỳ 30 ngày dọn dẹp video lỗi)
 * - Stage 6: Cache Invalidation (Next.js ISR revalidation)
 */
async function main() {
  console.log("==================================================================");
  console.log("🚀 [DateMate Automated Pipeline] KHỞI ĐỘNG QUY TRÌNH TỰ ĐỘNG HÓA");
  console.log("==================================================================");

  const startTime = Date.now();
  const now = new Date();

  // 0. Kiểm tra Blocklist Rules
  const blocklist: PlaceBlocklist[] = await db.select().from(placeBlocklist);
  console.log(`[Stage 0] Đã tải ${blocklist.length} quy tắc cấm (Blocklist Rules).`);

  // ==================================================================
  // STAGE 1: ĐỒNG BỘ DỮ LIỆU ĐẦU VÀO (INGESTION SOURCES)
  // ==================================================================
  console.log("\n--- [Stage 1.1] Cào Video Review Hẹn hò & Địa điểm Đúng Trọng Tâm (YouTube Couple Crawler) ---");
  const crawler = new YouTubeCoupleReviewCrawler();
  const crawlMatrix = [
    {
      category: "quán cafe view đẹp",
      location: "Hà Nội",
      coupleKeywords: ["cho cặp đôi", "hẹn hò", "đi date"],
      maxResultsPerQuery: 5,
    },
    {
      category: "món ăn ngon",
      location: "Hà Nội",
      coupleKeywords: ["hẹn hò", "cho cặp đôi"],
      maxResultsPerQuery: 5,
    },
    {
      category: "địa điểm chill",
      location: "Hà Nội",
      coupleKeywords: ["cho cặp đôi", "2 người"],
      maxResultsPerQuery: 5,
    },
    {
      category: "khách sạn homestay lãng mạn",
      location: "Hà Nội",
      coupleKeywords: ["cho cặp đôi", "2 người"],
      maxResultsPerQuery: 5,
    },
  ];

  const crawledVideos = await crawler.crawlMatrix(crawlMatrix);
  console.log(`=> Thu thập thành công ${crawledVideos.length} video hẹn hò chuẩn xác.`);

  console.log("\n--- [Stage 1.2] Thu thập Ứng viên Địa điểm Hẹn hò (OpenStreetMap) ---");
  const osmResult = await runOsmIngestion({
    dryRun: false,
    delayMs: 3000,
    insertToDb: true,
    executor: db,
    districts: ["hoan_kiem", "ba_dinh", "tay_ho"],
  });
  console.log(`=> Đã quét ${osmResult.districtsScanned} quận, tìm thấy ${osmResult.qualifyingCandidatesCount} ứng viên đạt chuẩn.`);

  // [EXTENSIBLE HOOK] Tương lai tích hợp cron thu thập ảnh tự động (Unsplash, Pexels, Google Places)
  // await runPhotoIngestionCron({ ... });

  // [EXTENSIBLE HOOK] Tương lai tích hợp AI sinh tiêu đề, mô tả và tags tự động
  // await runMetadataGenerationCron({ ... });

  // ==================================================================
  // STAGE 2: SO KHỚP ĐA ĐỐI ĐA (CROSS-MATCHING)
  // ==================================================================
  console.log("\n--- [Stage 2] So khớp Đa-Đối-Đa (Matching Engine) ---");

  // Lấy cả địa điểm chính thức (places) và ứng viên (candidatePlaces)
  const publishedPlaces: Place[] = await db
    .select()
    .from(places)
    .where(eq(places.status, "published"));

  const pendingCandidates: CandidatePlace[] = await db
    .select()
    .from(candidatePlaces)
    .where(eq(candidatePlaces.status, "pending"))
    .limit(50);

  const allTargetsForMatch: PlaceForMatching[] = [
    ...publishedPlaces.map((p) => ({
      id: p.id,
      name: p.name,
      address: p.address,
      district: p.area || p.city,
    })),
    ...pendingCandidates.map((c) => ({
      id: c.id,
      name: c.name,
      address: c.address,
      district: c.city,
    })),
  ];

  const videosForMatch: VideoForMatching[] = crawledVideos.map((v) => ({
    videoId: v.videoId,
    title: v.title,
    description: v.description,
    channelId: v.channelId,
    channelTitle: v.channelTitle,
    publishedAt: v.publishedAt,
  }));

  const matchResults = matchVideosWithPlaces(allTargetsForMatch, videosForMatch);
  console.log(`=> Tìm thấy ${matchResults.length} liên kết có ý nghĩa giữa Video và Địa điểm.`);

  // Cập nhật liên kết vào bảng place_videos
  for (const m of matchResults) {
    const video = videosForMatch.find((v) => v.videoId === m.videoId);
    await db
      .insert(placeVideos)
      .values({
        placeId: m.placeId,
        videoId: m.videoId,
        channelId: video?.channelId,
        channelTitle: video?.channelTitle,
        hasPaidPlacement: false,
        confidenceScore: m.score.toString(),
        status: m.score >= 70 ? "auto_linked" : "pending_review",
        publishedAt: video?.publishedAt ? new Date(video.publishedAt) : now,
        lastCheckedAt: now,
      })
      .onDuplicateKeyUpdate({
        set: {
          confidenceScore: m.score.toString(),
          status: m.score >= 70 ? "auto_linked" : "pending_review",
          lastCheckedAt: now,
        },
      });
  }

  // ==================================================================
  // STAGE 3: TỰ ĐỘNG XUẤT BẢN VIDEO RA WEB END-USER (AUTO-PUBLISH MEDIA)
  // ==================================================================
  console.log("\n--- [Stage 3] Tự động xuất bản Video Review sang place_media ---");
  const publishMediaResult = await autoPublishMatchedVideos({
    executor: db,
    minConfidence: 60,
    revalidate: false, // sẽ revalidate ở Stage 6
  });
  console.log(`=> Đã xuất bản ${publishMediaResult.publishedToMediaCount} video mới vào ${publishMediaResult.placesUpdatedCount} địa điểm.`);

  // ==================================================================
  // STAGE 4: THẨM ĐỊNH THĂNG HẠNG ỨNG VIÊN (PROMOTION GATEKEEPER)
  // ==================================================================
  console.log("\n--- [Stage 4] Thẩm định Cửa Hẹp Tự Xuất Bản (Auto-Promotion) ---");
  let promotedCount = 0;

  for (const candidate of pendingCandidates) {
    const linkedVids: PlaceVideo[] = await db
      .select()
      .from(placeVideos)
      .where(eq(placeVideos.placeId, candidate.id));

    const evalResult = evaluateCandidateForPromotion(candidate, linkedVids, blocklist, now);

    if (evalResult.promoted) {
      console.log(`✨ [PROMOTE] Địa điểm "${candidate.name}" đủ 4 điều kiện thăng hạng!`);

      const topVideo = linkedVids.find((v) => v.status === "auto_linked");
      if (topVideo) {
        try {
          const enrichRes = await enrichPlaceWithAi({
            placeId: candidate.id,
            placeName: candidate.name,
            videoTitle: `Video review về ${candidate.name}`,
            videoDescription: `Không gian trải nghiệm tại ${candidate.address}`,
            executor: db,
          });
          console.log(`   [AI Enriched] Summary: ${enrichRes.enrichment.summary.slice(0, 60)}...`);
        } catch (err: unknown) {
          console.warn(`   [AI Warning] Bỏ qua AI enrichment: ${err instanceof Error ? err.message : err}`);
        }
      }

      const promoteRes = await promoteCandidateToPlace(candidate, linkedVids, blocklist, db);
      if (promoteRes.promoted) {
        promotedCount++;
        console.log(`   => Đã xuất bản thành công Place ID: ${promoteRes.promotedPlaceId}`);
      }
    } else {
      console.log(`⏳ [HOLD] "${candidate.name}" chưa đủ điều kiện: ${evalResult.reasons.join(", ")}`);
    }
  }

  // ==================================================================
  // STAGE 5: BẢO TRÌ VIDEO YOUTUBE 30 NGÀY (MAINTENANCE)
  // ==================================================================
  console.log("\n--- [Stage 5] Chạy Quét Bảo Trì Video YouTube 30 ngày ---");
  const maintResult = await runYoutubeMaintenanceCron({
    daysThreshold: 30,
    batchSize: 50,
    executor: db,
  });
  console.log(`=> Đã quét ${maintResult.scannedCount} video, loại bỏ ${maintResult.unembeddableOrDeletedCount} video không hợp lệ.`);

  // ==================================================================
  // STAGE 6: NEXT.JS ISR REVALIDATION (LÀM MỚI CACHE NGAY CHO END-USER)
  // ==================================================================
  console.log("\n--- [Stage 6] Next.js ISR Cache Revalidation ---");
  try {
    revalidatePlaceCatalog();
    console.log("=> Revalidate cache thành công! End-user xem ngay dữ liệu mới nhất.");
  } catch (err) {
    console.warn("=> Bỏ qua revalidation (CLI context):", err);
  }

  const durationSec = Math.round((Date.now() - startTime) / 1000);
  console.log("\n==================================================================");
  console.log(`🎉 [CRON HOÀN THÀNH] Thời gian thực thi: ${durationSec}s`);
  console.log(`   - Video hẹn hò thu thập: ${crawledVideos.length}`);
  console.log(`   - Ứng viên OSM đạt chuẩn: ${osmResult.qualifyingCandidatesCount}`);
  console.log(`   - Video mới xuất bản vào place_media: ${publishMediaResult.publishedToMediaCount}`);
  console.log(`   - Địa điểm thăng hạng xuất bản mới: ${promotedCount}`);
  console.log("==================================================================");
  return {
    promotedCount,
    summary: {
      crawledVideos: crawledVideos.length,
      osmCandidates: osmResult.qualifyingCandidatesCount,
      publishedToMediaCount: publishMediaResult.publishedToMediaCount,
      promotedCount,
    },
  };
}

runTrackedPipeline("auto_promote", async () => {
  const { promotedCount, summary } = await main();
  return { result: undefined, promotedCount, summary };
}).catch((err) => {
  console.error("❌ [CRON FATAL ERROR]:", err);
  process.exit(1);
});
