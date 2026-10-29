import { runTrackedPipeline } from "@/server/services/pipeline/pipeline-run.service";
import { autoPublishMatchedVideos } from "@/server/services/pipeline/auto-publish-videos.service";

async function main() {
  console.log("=====================================================");
  console.log("🎬 [DateMate Auto-Publish] XUẤT BẢN VIDEO REVIEW RA WEB");
  console.log("=====================================================");

  const startTime = Date.now();
  const result = await autoPublishMatchedVideos({
    minConfidence: 60,
    revalidate: true,
  });

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`\n🎉 [KẾT QUẢ XUẤT BẢN THÀNH CÔNG] (${durationSec}s)`);
  console.log(`   - Tổng số video đã quét: ${result.totalProcessedVideos}`);
  console.log(`   - Số liên kết đạt chuẩn (score >= 60): ${result.matchedWithPlacesCount}`);
  console.log(`   - Số video mới xuất bản vào place_media: ${result.publishedToMediaCount}`);
  console.log(`   - Số địa điểm chính thức được bổ sung video: ${result.placesUpdatedCount}`);

  console.log("\n📋 Chi tiết các video được liên kết & xuất bản:");
  result.details.forEach((item, idx) => {
    console.log(
      `   ${idx + 1}. [${item.score} điểm] "${item.placeName}" <---> "${item.videoTitle}" (${item.channelTitle})`
    );
  });
  console.log("=====================================================\n");
  return { summary: { publishedToMediaCount: result.publishedToMediaCount, matched: result.matchedWithPlacesCount } };
}

runTrackedPipeline("video_match", async () => {
  const { summary } = await main();
  return { result: undefined, summary };
}).catch((err) => {
  console.error("❌ Lỗi khi xuất bản video:", err);
  process.exit(1);
});
