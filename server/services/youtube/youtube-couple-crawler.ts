import { reserveQuota } from "./quota-ledger";
import * as fs from "fs";
import * as path from "path";

export interface CoupleCrawlInput {
  category: string; // e.g. "món ăn", "quán cafe", "địa điểm chill", "chụp ảnh", "khách sạn", "địa điểm đi chơi"
  location: string; // e.g. "Hà Nội", "Đà Lạt", "TP.HCM", "Đà Nẵng"
  coupleKeywords?: string[]; // e.g. ["cặp đôi", "hẹn hò", "đi date", "2 người", "riêng tư"]
  maxResultsPerQuery?: number; // default 10
}

export interface CrawledCoupleVideo {
  videoId: string;
  title: string;
  description: string;
  channelTitle: string;
  channelId: string;
  publishedAt: string;
  url: string;
  thumbnailUrl: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  duration?: string;
  isEmbeddable: boolean;
  searchCategory: string;
  searchLocation: string;
  searchFocus: string;
  fetchedAt: string;
}

export interface CoupleCrawlerOptions {
  apiKey?: string;
  dryRun?: boolean;
  outputFilePath?: string;
  referer?: string;
}

/**
 * Danh mục negative keywords để loại bỏ triệt để các video lạc đề:
 * Du lịch nước ngoài, tin tức, drama, phim, bóng đá, trò chơi...
 */
const FOREIGN_AND_JUNK_KEYWORDS = [
  "du lịch nga",
  "trung quốc",
  "hồng kông",
  "hong kong",
  "thái lan",
  "bangkok",
  "châu âu",
  "kenya",
  "châu phi",
  "nhật bản",
  "tokyo",
  "hàn quốc",
  "seoul",
  "đài loan",
  "singapore",
  "mỹ",
  "new york",
  "pháp",
  "paris",
  "anh quốc",
  "london",
  "ấn độ",
  "thụy sĩ",
  "iceland",
  "băng đảo",
  "thời sự",
  "tai nạn",
  "đánh ghen",
  "bóng đá",
  "highlight",
  "liên quân",
  "free fire",
  "phim ngắn",
  "phim hài",
];

export class YouTubeCoupleReviewCrawler {
  private apiKey: string;
  private dryRun: boolean;
  private referer: string;

  constructor(options: CoupleCrawlerOptions = {}) {
    this.apiKey = options.apiKey || process.env.YOUTUBE_API_KEY || "";
    this.dryRun = options.dryRun || !this.apiKey;
    this.referer = options.referer || "http://localhost:3000";
  }

  /**
   * Tạo các biến thể từ khóa tối ưu cho tìm kiếm video hẹn hò / cặp đôi theo chuẩn yêu cầu
   */
  public generateSearchQueries(
    category: string,
    location: string,
    customKeywords?: string[]
  ): Array<{ query: string; focus: string }> {
    const defaultCoupleKeywords = [
      "cho cặp đôi",
      "hẹn hò",
      "đi date",
      "2 người",
      "lãng mạn",
      "riêng tư",
    ];

    const coupleKeywords = customKeywords && customKeywords.length > 0 ? customKeywords : defaultCoupleKeywords;
    const queries: Array<{ query: string; focus: string }> = [];

    // 1. Dạng query trực tiếp theo template: "review {category} {location} {kw}"
    for (const kw of coupleKeywords) {
      queries.push({
        query: `review ${category} ${location} ${kw}`.trim(),
        focus: kw,
      });
    }

    // 2. Dạng query tự nhiên chuyên biệt cho các intent hẹn hò phổ biến
    const intentTemplates = [
      { t: `review địa điểm đi date ${location}`, f: "đi date" },
      { t: `review địa điểm chill ${location} 2 người`, f: "2 người" },
      { t: `review các món ăn ngon ${location} hẹn hò`, f: "hẹn hò" },
      { t: `review quán cafe view đẹp ${location} cặp đôi`, f: "cặp đôi" },
      { t: `review khách sạn homestay lãng mạn ${location} cho 2 người`, f: "lãng mạn" },
      { t: `review chụp ảnh check-in sống ảo ${location} cặp đôi`, f: "chụp ảnh cặp đôi" },
    ];

    for (const item of intentTemplates) {
      if (!queries.some((q) => q.query.toLowerCase() === item.t.toLowerCase())) {
        queries.push({ query: item.t, focus: item.f });
      }
    }

    return queries;
  }

  /**
   * Thẩm định video có hợp lệ và đúng trọng tâm hẹn hò/địa điểm hay không
   */
  public isTargetCoupleVideo(title: string, description: string = "", targetLocation: string = "Hà Nội"): boolean {
    const text = `${title} ${description}`.toLowerCase();

    // Loại bỏ nếu dính từ khóa nước ngoài hoặc rác
    for (const junk of FOREIGN_AND_JUNK_KEYWORDS) {
      if (text.includes(junk)) {
        return false;
      }
    }

    // Nếu location là Hà Nội, kiểm tra có ngữ cảnh liên quan tới Việt Nam / Hà Nội hoặc hẹn hò
    if (targetLocation.toLowerCase().includes("hà nội")) {
      const hanoiContext =
        /hà nội|hanoi|phố cổ|hồ tây|hoàn kiếm|ba đình|tây hồ|long biên|cầu giấy|đống đa|hai bà trưng|quán|quận|đi date|hẹn hò|cặp đôi|2 người|chill/.test(
          text
        );
      if (!hanoiContext) {
        return false;
      }
    }

    return true;
  }

  /**
   * Cào video theo một input (Category + Location + Focus)
   */
  public async crawlReviewsForInput(
    input: CoupleCrawlInput,
    seenVideoIds: Set<string> = new Set()
  ): Promise<CrawledCoupleVideo[]> {
    const { category, location, coupleKeywords, maxResultsPerQuery = 10 } = input;
    const queries = this.generateSearchQueries(category, location, coupleKeywords);
    const crawledVideos: CrawledCoupleVideo[] = [];

    console.log(`\n🎯 [Couple Crawler] Bắt đầu cào danh mục: "${category}" tại "${location}" (${queries.length} queries)...`);

    for (const qObj of queries) {
      const query = qObj.query;
      const focus = qObj.focus;
      console.log(`🔍 Đang crawl với từ khóa: '${query}'...`);

      if (this.dryRun) {
        // Mock dữ liệu kiểm thử khi dryRun
        const mockId = `mock_${Math.random().toString(36).substring(2, 10)}`;
        if (!seenVideoIds.has(mockId)) {
          seenVideoIds.add(mockId);
          crawledVideos.push({
            videoId: mockId,
            title: `Review ${category} ${location} lãng mạn cho cặp đôi đi date`,
            description: `Không gian cực chill tại ${location} phù hợp hẹn hò 2 người.`,
            channelTitle: "Date Reviewer Test",
            channelId: "UC_mock_date_reviewer",
            publishedAt: new Date().toISOString(),
            url: `https://www.youtube.com/watch?v=${mockId}`,
            thumbnailUrl: `https://i.ytimg.com/vi/${mockId}/hqdefault.jpg`,
            viewCount: 15200,
            likeCount: 450,
            commentCount: 32,
            isEmbeddable: true,
            searchCategory: category,
            searchLocation: location,
            searchFocus: focus,
            fetchedAt: new Date().toISOString(),
          });
        }
        continue;
      }

      // 1. Quota Ledger check & reserve: search.list = 100 units
      const quotaRes = await reserveQuota(100);
      if (!quotaRes.success) {
        console.warn(`⚠️ [Quota Halted] Không đủ hạn mức YouTube quota (Search): ${quotaRes.reason}`);
        break;
      }

      try {
        // 2. Gọi YouTube Search API
        const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
        searchUrl.searchParams.set("key", this.apiKey);
        searchUrl.searchParams.set("q", query);
        searchUrl.searchParams.set("part", "snippet");
        searchUrl.searchParams.set("type", "video");
        searchUrl.searchParams.set("order", "relevance");
        searchUrl.searchParams.set("relevanceLanguage", "vi");
        searchUrl.searchParams.set("maxResults", Math.min(maxResultsPerQuery, 25).toString());

        const searchRes = await fetch(searchUrl.toString(), {
          headers: { Referer: this.referer },
        });
        if (!searchRes.ok) {
          const errText = await searchRes.text();
          console.error(`❌ Lỗi YouTube Search API (${searchRes.status}):`, errText);
          continue;
        }

        const searchJson = await searchRes.json();
        const items = searchJson.items || [];

        const batchVideoIds: string[] = [];
        for (const it of items) {
          const vId = it?.id?.videoId;
          if (vId && !seenVideoIds.has(vId)) {
            // Lọc nhanh bằng title xem có dính nước ngoài/rác không
            if (this.isTargetCoupleVideo(it?.snippet?.title || "", it?.snippet?.description || "", location)) {
              seenVideoIds.add(vId);
              batchVideoIds.push(vId);
            }
          }
        }

        if (batchVideoIds.length === 0) {
          continue;
        }

        // 3. Quota Ledger check & reserve: videos.list = 1 unit
        const videoQuotaRes = await reserveQuota(1);
        if (!videoQuotaRes.success) {
          console.warn(`⚠️ [Quota Halted] Không đủ hạn mức YouTube quota (Videos): ${videoQuotaRes.reason}`);
          break;
        }

        // 4. Gọi YouTube Videos API để lấy chi tiết views, likes, embeddable, duration
        const videosUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
        videosUrl.searchParams.set("key", this.apiKey);
        videosUrl.searchParams.set("id", batchVideoIds.join(","));
        videosUrl.searchParams.set("part", "snippet,statistics,contentDetails,status");

        const vidDetailsRes = await fetch(videosUrl.toString(), {
          headers: { Referer: this.referer },
        });
        if (!vidDetailsRes.ok) {
          const errText = await vidDetailsRes.text();
          console.error(`❌ Lỗi YouTube Videos API (${vidDetailsRes.status}):`, errText);
          continue;
        }

        const vidDetailsJson = await vidDetailsRes.json();
        const detailItems = vidDetailsJson.items || [];

        for (const item of detailItems) {
          const snippet = item.snippet || {};
          const stats = item.statistics || {};
          const status = item.status || {};
          const content = item.contentDetails || {};

          const isEmbed = status.embeddable !== false;
          if (!isEmbed) continue;

          // Kiểm tra lại lần cuối bằng cả full description
          if (!this.isTargetCoupleVideo(snippet.title || "", snippet.description || "", location)) {
            continue;
          }

          crawledVideos.push({
            videoId: item.id,
            title: snippet.title || "",
            description: snippet.description || "",
            channelTitle: snippet.channelTitle || "",
            channelId: snippet.channelId || "",
            publishedAt: snippet.publishedAt || new Date().toISOString(),
            url: `https://www.youtube.com/watch?v=${item.id}`,
            thumbnailUrl:
              snippet.thumbnails?.high?.url ||
              snippet.thumbnails?.medium?.url ||
              `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
            viewCount: parseInt(stats.viewCount || "0", 10),
            likeCount: parseInt(stats.likeCount || "0", 10),
            commentCount: parseInt(stats.commentCount || "0", 10),
            duration: content.duration,
            isEmbeddable: isEmbed,
            searchCategory: category,
            searchLocation: location,
            searchFocus: focus,
            fetchedAt: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error(`❌ Ngoại lệ khi cào từ khóa "${query}":`, err);
      }
    }

    console.log(`✅ [Couple Crawler] Đã crawl được ${crawledVideos.length} video chuẩn cho danh mục "${category}"!`);
    return crawledVideos;
  }

  /**
   * Cào hàng loạt theo ma trận các danh mục & địa điểm trọng điểm
   */
  public async crawlMatrix(
    matrixInputs: CoupleCrawlInput[],
    options?: { outputFilePath?: string }
  ): Promise<CrawledCoupleVideo[]> {
    const allVideos: CrawledCoupleVideo[] = [];
    const seenVideoIds = new Set<string>();

    for (const input of matrixInputs) {
      const videos = await this.crawlReviewsForInput(input, seenVideoIds);
      allVideos.push(...videos);
    }

    // Sắp xếp video theo độ hot (lượt xem & ngày đăng)
    allVideos.sort((a, b) => b.viewCount - a.viewCount);

    const outputFilePath =
      options?.outputFilePath || path.resolve(process.cwd(), "scripts/output/youtube/raw_videos.json");

    const outputDir = path.dirname(outputFilePath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputFilePath, JSON.stringify(allVideos, null, 2), "utf-8");
    console.log(`\n💾 [Save Complete] Đã lưu thành công ${allVideos.length} video độc bản vào: ${outputFilePath}`);

    return allVideos;
  }
}
