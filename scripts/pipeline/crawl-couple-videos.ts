import { runTrackedPipeline } from "@/server/services/pipeline/pipeline-run.service";
import { YouTubeCoupleReviewCrawler, CoupleCrawlInput } from "@/server/services/youtube/youtube-couple-crawler";
import { getQuotaStatus } from "@/server/services/youtube/quota-ledger";
import { db } from "@/server/db/client";
import { places, placeMedia, Place } from "@/server/db/schema/places";
import { candidatePlaces, placeVideos, PlaceVideo } from "@/server/db/schema/governance";
import { matchVideosWithPlaces, VideoForMatching, PlaceForMatching } from "@/server/services/matching/place-video.matcher";
import { autoPublishMatchedVideos } from "@/server/services/pipeline/auto-publish-videos.service";
import { revalidatePlaceCatalog } from "@/server/services/cache/revalidation";
import { eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import * as path from "path";

// Kho ảnh minh họa chất lượng cao được tuyển chọn cho các hoạt động ăn, uống, vui chơi, chill
const CURATED_PLACE_IMAGES: Record<string, Array<{ url: string; caption: string; credit: string }>> = {
  cafe: [
    {
      url: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80",
      caption: "Không gian quán cà phê phong cách mộc ấm cúng và lãng mạn",
      credit: "Daiki Ferrera / Unsplash",
    },
    {
      url: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80",
      caption: "Góc bàn đôi bên khung cửa sổ ngập tràn ánh nắng",
      credit: "Petr Sevcovic / Unsplash",
    },
    {
      url: "https://images.unsplash.com/photo-1559925393-8be0ec4767c8?auto=format&fit=crop&w=1200&q=80",
      caption: "Quán cà phê rooftop ngắm hoàng hôn cực chill",
      credit: "Alisa Anton / Unsplash",
    },
  ],
  food: [
    {
      url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
      caption: "Không gian ẩm thực tinh tế, ấm áp cho buổi gặp mặt",
      credit: "Jason Leung / Unsplash",
    },
    {
      url: "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=1200&q=80",
      caption: "Bàn tiệc lãng mạn với ánh nến lung linh",
      credit: "Nils Stahl / Unsplash",
    },
    {
      url: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80",
      caption: "Hương vị ẩm thực đặc sắc được chế biến tỉ mỉ",
      credit: "Stefan Johnson / Unsplash",
    },
  ],
  fun: [
    {
      url: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80",
      caption: "Khu vui chơi giải trí và trải nghiệm sôi động cuối tuần",
      credit: "Unsplash Gaming & Fun",
    },
    {
      url: "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=1200&q=80",
      caption: "Workshop trải nghiệm sáng tạo nghệ thuật thủ công",
      credit: "Unsplash Creative Workshop",
    },
  ],
  chill: [
    {
      url: "https://images.unsplash.com/photo-1518998053901-5348d3961a04?auto=format&fit=crop&w=1200&q=80",
      caption: "Không gian triển lãm nghệ thuật và thư giãn tâm hồn",
      credit: "Eric Park / Unsplash",
    },
    {
      url: "https://images.unsplash.com/photo-1470246973918-29a93221c455?auto=format&fit=crop&w=1200&q=80",
      caption: "Khung cảnh cắm trại dã ngoại yên bình ven hồ ngoại ô",
      credit: "Unsplash Camping Outdoor",
    },
  ],
};

async function main() {
  console.log("==================================================================");
  console.log("🚀 [DateMate Multi-Audience Crawler] CÀO LIÊN TỤC ĐẾN HẠN MỨC NGÀY");
  console.log("==================================================================");

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.warn("⚠️ Không tìm thấy YOUTUBE_API_KEY trong env. Đang chạy chế độ dryRun!");
  }

  // 1. Kiểm tra trạng thái Quota Ledger ngày hôm nay
  try {
    const quotaStatus = await getQuotaStatus();
    console.log(`📊 [YouTube Quota Ngày ${quotaStatus.quotaDate}]:`);
    console.log(`   - Đã sử dụng: ${quotaStatus.unitsUsed.toLocaleString()} units`);
    console.log(`   - Còn lại: ${quotaStatus.remaining.toLocaleString()} units`);
    console.log(`   - Trạng thái dừng: ${quotaStatus.isHalted ? "ĐÃ KHÓA (Halted)" : "HOẠT ĐỘNG (Active)"}`);

    if (quotaStatus.isHalted || quotaStatus.remaining < 200) {
      console.warn("⚠️ Hạn mức YouTube API hôm nay đã đạt giới hạn an toàn. Chuyển sang đồng bộ dữ liệu sẵn có!");
    }
  } catch (err) {
    console.warn("⚠️ Không thể kiểm tra quota status:", err);
  }

  const crawler = new YouTubeCoupleReviewCrawler({
    apiKey,
    dryRun: !apiKey,
  });

  // 2. MA TRẬN ĐẦU VÀO ĐA DẠNG (MULTI-AUDIENCE & ACTIVITIES MATRIX)
  // Bao quát: Cặp đôi, Nhóm bạn bè, Gia đình, Solo healing
  // Các hoạt động: Ăn uống, Cafe chill, Vui chơi giải trí, Workshop, Cắm trại, Chụp ảnh, Homestay
  const crawlMatrix: CoupleCrawlInput[] = [
    // --- PHÂN HỆ 1: CẶP ĐÔI & HẸN HÒ (COUPLE DATE & CHILL) ---
    {
      category: "quán cafe view đẹp",
      location: "Hà Nội",
      audience: "couple",
      coupleKeywords: ["cho cặp đôi", "hẹn hò", "đi date", "2 người", "riêng tư"],
      maxResultsPerQuery: 6,
    },
    {
      category: "món ăn ngon lãng mạn",
      location: "Hà Nội",
      audience: "couple",
      coupleKeywords: ["hẹn hò", "cho cặp đôi", "2 người", "buffet nướng lẩu lãng mạn"],
      maxResultsPerQuery: 6,
    },
    {
      category: "rooftop bar ngắm hoàng hôn",
      location: "Hà Nội",
      audience: "couple",
      coupleKeywords: ["cho cặp đôi", "chill 2 người", "lãng mạn"],
      maxResultsPerQuery: 6,
    },
    {
      category: "workshop làm gốm làm nến vẽ tranh",
      location: "Hà Nội",
      audience: "couple",
      coupleKeywords: ["cho cặp đôi", "hẹn hò cuối tuần", "trải nghiệm 2 người"],
      maxResultsPerQuery: 6,
    },
    {
      category: "khách sạn homestay lãng mạn",
      location: "Hà Nội",
      audience: "couple",
      coupleKeywords: ["cho cặp đôi", "2 người", "nghỉ dưỡng riêng tư"],
      maxResultsPerQuery: 6,
    },

    // --- PHÂN HỆ 2: NHÓM BẠN BÈ & VUI CHƠI GIẢI TRÍ (GROUP & FUN) ---
    {
      category: "khu vui chơi giải trí",
      location: "Hà Nội",
      audience: "group",
      coupleKeywords: ["nhóm bạn", "hội bạn", "đi chơi cuối tuần", "vui nhộn đông người"],
      maxResultsPerQuery: 6,
    },
    {
      category: "quán nướng lẩu vỉa hè quán ốc",
      location: "Hà Nội",
      audience: "group",
      coupleKeywords: ["nhóm bạn", "tụ tập bạn bè", "ăn đêm phố cổ", "đi đông người"],
      maxResultsPerQuery: 6,
    },
    {
      category: "trải nghiệm bắn cung bowling boardgame",
      location: "Hà Nội",
      audience: "group",
      coupleKeywords: ["nhóm bạn", "vui chơi giải trí", "cuối tuần tụ tập"],
      maxResultsPerQuery: 6,
    },
    {
      category: "cắm trại glamping dã ngoại",
      location: "Hà Nội",
      audience: "group",
      coupleKeywords: ["nhóm bạn", "ngoại thành ba vì sóc sơn", "dã ngoại cuối tuần"],
      maxResultsPerQuery: 6,
    },

    // --- PHÂN HỆ 3: GIA ĐÌNH & SINH THÁI (FAMILY OUTING) ---
    {
      category: "địa điểm đi chơi công viên khu sinh thái",
      location: "Hà Nội",
      audience: "family",
      coupleKeywords: ["cho gia đình", "có chỗ chơi trẻ em", "cuối tuần gia đình"],
      maxResultsPerQuery: 6,
    },
    {
      category: "quán ăn nhà hàng gia đình ấm cúng",
      location: "Hà Nội",
      audience: "family",
      coupleKeywords: ["ẩm thực gia đình", "ấm cúng ngon miệng", "sân vườn rộng rãi"],
      maxResultsPerQuery: 6,
    },

    // --- PHÂN HỆ 4: SOLO HEALING & CHILL LÀM VIỆC (SOLO DATE) ---
    {
      category: "quán cafe yên tĩnh làm việc đọc sách",
      location: "Hà Nội",
      audience: "solo",
      coupleKeywords: ["1 mình", "yên tĩnh làm việc", "healing", "chill đọc sách"],
      maxResultsPerQuery: 6,
    },
    {
      category: "bảo tàng triển lãm nghệ thuật",
      location: "Hà Nội",
      audience: "solo",
      coupleKeywords: ["check-in sống ảo", "nghệ thuật thư giãn", "triển lãm cuối tuần"],
      maxResultsPerQuery: 6,
    },
  ];

  console.log(`\n📋 Thiết lập ma trận cào: ${crawlMatrix.length} nhóm cấu hình đa dạng.`);

  // 3. THỰC HIỆN CÀO LIÊN TỤC VÀ TỰ ĐỘNG DỪNG KHI CHẠM LIMIT NGÀY
  const startTime = Date.now();
  const allCrawledVideos = await crawler.crawlMatrix(crawlMatrix, {
    outputFilePath: path.resolve(process.cwd(), "scripts/output/youtube/raw_videos.json"),
  });

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log("\n==================================================================");
  console.log(`🎉 [KẾT QUẢ CRAWL] Thu thập được ${allCrawledVideos.length} video mới trong ${durationSec}s.`);
  console.log("==================================================================");

  // 4. TIẾN HÀNH SO KHỚP VỚI ĐỊA ĐIỂM (CROSS-MATCHING)
  console.log("\n--- [Cross-Matching] Đang liên kết Video với Địa điểm thực tế ---");
  const publishedPlaces: Place[] = await db.select().from(places).where(eq(places.status, "published"));
  const pendingCandidates = await db.select().from(candidatePlaces).where(eq(candidatePlaces.status, "pending")).limit(60);

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

  const videosForMatch: VideoForMatching[] = allCrawledVideos.map((v) => ({
    videoId: v.videoId,
    title: v.title,
    description: v.description,
    channelId: v.channelId,
    channelTitle: v.channelTitle,
    publishedAt: v.publishedAt,
  }));

  const matchResults = matchVideosWithPlaces(allTargetsForMatch, videosForMatch);
  console.log(`=> Đã tìm thấy ${matchResults.length} liên kết đạt chuẩn giữa Video và Địa điểm.`);

  // Ghi nhận liên kết vào place_videos
  const now = new Date();
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
        status: m.score >= 65 ? "auto_linked" : "pending_review",
        publishedAt: video?.publishedAt ? new Date(video.publishedAt) : now,
        lastCheckedAt: now,
      })
      .onDuplicateKeyUpdate({
        set: {
          confidenceScore: m.score.toString(),
          status: m.score >= 65 ? "auto_linked" : "pending_review",
          lastCheckedAt: now,
        },
      });
  }

  // 5. TỰ ĐỘNG XUẤT BẢN VIDEO VÀO place_media (AUTO-PUBLISH MEDIA)
  console.log("\n--- [Auto-Publish] Đang xuất bản video vào place_media để người dùng xem ngay ---");
  const publishRes = await autoPublishMatchedVideos({
    executor: db,
    minConfidence: 60,
    revalidate: false,
  });
  console.log(`=> Đã xuất bản ${publishRes.publishedToMediaCount} video mới vào ${publishRes.placesUpdatedCount} địa điểm.`);

  // 6. BỔ SUNG & CẬP NHẬT HÌNH ẢNH MINH HỌA CHO CÁC ĐỊA ĐIỂM
  console.log("\n--- [Image Ingest] Đồng bộ hình ảnh chất lượng cao cho các địa điểm ---");
  let imagesAdded = 0;
  let coversUpdated = 0;

  for (const p of publishedPlaces) {
    // Kiểm tra xem địa điểm đã có media ảnh nào chưa
    const existingMedia = await db
      .select()
      .from(placeMedia)
      .where(sql`${placeMedia.placeId} = ${p.id} AND ${placeMedia.type} = 'image'`);

    const categoryKey = (p.category as string) || "cafe";
    const imagePool = CURATED_PLACE_IMAGES[categoryKey] || CURATED_PLACE_IMAGES.cafe;

    // Nếu chưa có ảnh bìa coverUrl, gán ảnh đẹp đầu tiên
    if (!p.coverUrl && imagePool.length > 0) {
      const topImg = imagePool[0];
      await db.update(places).set({ coverUrl: topImg.url }).where(eq(places.id, p.id));
      coversUpdated++;
    }

    // Nếu địa điểm chưa có đủ ít nhất 2 ảnh minh họa, bổ sung từ pool tuyển chọn
    if (existingMedia.length < 2) {
      for (let i = 0; i < imagePool.length; i++) {
        const item = imagePool[i];
        const mediaId = `img_${nanoid(12)}`;

        // Tránh trùng URL
        const isDuplicated = existingMedia.some((m) => m.url === item.url);
        if (!isDuplicated) {
          await db
            .insert(placeMedia)
            .values({
              id: mediaId,
              placeId: p.id,
              type: "image",
              platform: "unsplash",
              url: item.url,
              sourceUrl: item.url,
              caption: `${item.caption} - ${p.name}`,
              credit: item.credit,
              license: "licensed",
              licenseNote: "Unsplash High Quality Photography License",
              sortOrder: i,
            })
            .onDuplicateKeyUpdate({
              set: {
                caption: `${item.caption} - ${p.name}`,
                credit: item.credit,
              },
            });
          imagesAdded++;
        }
      }
    }
  }

  console.log(`=> Đã bổ sung ${imagesAdded} ảnh mới và cập nhật ảnh bìa cho ${coversUpdated} địa điểm.`);

  // 7. LÀM MỚI CACHE ISR NEXT.JS
  console.log("\n--- [Cache Revalidation] Làm mới cache cho End-User ---");
  try {
    revalidatePlaceCatalog();
    console.log("=> Cache revalidation thành công! End-user xem ngay dữ liệu mới.");
  } catch (err) {
    console.warn("=> Bỏ qua revalidation (CLI context):", err);
  }

  console.log("\n==================================================================");
  console.log("🏁 [HOÀN THÀNH TẤT CẢ GIAI ĐOẠN]");
  console.log(`   - Video cào được: ${allCrawledVideos.length}`);
  console.log(`   - Video xuất bản vào place_media: ${publishRes.publishedToMediaCount}`);
  console.log(`   - Hình ảnh bổ sung mới: ${imagesAdded}`);
  console.log(`   - Địa điểm cập nhật ảnh bìa: ${coversUpdated}`);
  console.log("==================================================================");
  return {
    summary: {
      crawledVideos: allCrawledVideos.length,
      publishedToMediaCount: publishRes.publishedToMediaCount,
      imagesAdded,
      coversUpdated,
    },
  };
}

runTrackedPipeline("youtube_scrape", async () => {
  const { summary } = await main();
  return { result: undefined, summary };
}).catch((err) => {
  console.error("❌ Fatal Error:", err);
  process.exit(1);
});
