import { YouTubeCoupleReviewCrawler, CoupleCrawlInput } from "@/server/services/youtube/youtube-couple-crawler";
import * as path from "path";

async function main() {
  console.log("==================================================================");
  console.log("❤️ [DateMate Couple Crawler] CÀO VIDEO HẸN HÒ & ĐỊA ĐIỂM ĐÚNG TRỌNG TÂM");
  console.log("==================================================================");

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.warn("⚠️ Không tìm thấy YOUTUBE_API_KEY trong env, chạy ở chế độ dryRun.");
  }

  const crawler = new YouTubeCoupleReviewCrawler({
    apiKey,
    dryRun: !apiKey,
  });

  // Ma trận cấu hình danh mục & địa điểm hẹn hò chuẩn xác của DateMate:
  const crawlMatrix: CoupleCrawlInput[] = [
    {
      category: "quán cafe view đẹp",
      location: "Hà Nội",
      coupleKeywords: ["cho cặp đôi", "hẹn hò", "đi date", "2 người"],
      maxResultsPerQuery: 8,
    },
    {
      category: "món ăn ngon",
      location: "Hà Nội",
      coupleKeywords: ["hẹn hò", "cho cặp đôi", "2 người"],
      maxResultsPerQuery: 8,
    },
    {
      category: "địa điểm chill",
      location: "Hà Nội",
      coupleKeywords: ["cho cặp đôi", "2 người", "lãng mạn"],
      maxResultsPerQuery: 8,
    },
    {
      category: "địa điểm đi date đi chơi",
      location: "Hà Nội",
      coupleKeywords: ["cặp đôi", "hẹn hò", "2 người"],
      maxResultsPerQuery: 8,
    },
    {
      category: "chụp ảnh check-in sống ảo",
      location: "Hà Nội",
      coupleKeywords: ["cặp đôi", "hẹn hò"],
      maxResultsPerQuery: 6,
    },
    {
      category: "khách sạn homestay lãng mạn",
      location: "Hà Nội",
      coupleKeywords: ["cho cặp đôi", "2 người", "riêng tư"],
      maxResultsPerQuery: 6,
    },
  ];

  const startTime = Date.now();
  const results = await crawler.crawlMatrix(crawlMatrix, {
    outputFilePath: path.resolve(process.cwd(), "scripts/output/youtube/raw_videos.json"),
  });

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log("\n==================================================================");
  console.log(`🎉 [HOÀN THÀNH CRAWL] Thời gian: ${durationSec}s | Đã lưu ${results.length} video.`);
  console.log("==================================================================");

  // In mẫu 5 video đầu tiên
  console.log("\nTop 5 video hàng đầu thu thập được:");
  results.slice(0, 5).forEach((v, idx) => {
    console.log(`\n${idx + 1}. [${v.searchCategory} • ${v.searchLocation}] ${v.title}`);
    console.log(`   Kênh: ${v.channelTitle} | Views: ${v.viewCount.toLocaleString()} | Likes: ${v.likeCount.toLocaleString()}`);
    console.log(`   Link: ${v.url}`);
    console.log(`   Focus: ${v.searchFocus}`);
  });
}

main().catch((err) => {
  console.error("❌ Fatal Error:", err);
  process.exit(1);
});
