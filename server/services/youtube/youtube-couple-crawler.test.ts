import { describe, it, expect } from "vitest";
import { YouTubeCoupleReviewCrawler } from "./youtube-couple-crawler";

describe("YouTubeCoupleReviewCrawler", () => {
  const crawler = new YouTubeCoupleReviewCrawler({ dryRun: true });

  describe("generateSearchQueries", () => {
    it("should generate queries combining category, location, and couple keywords", () => {
      const queries = crawler.generateSearchQueries("món ăn", "Hà Nội");

      expect(queries.length).toBeGreaterThan(0);
      const queryStrings = queries.map((q) => q.query);

      // Template matches
      expect(queryStrings).toContain("review món ăn Hà Nội cho cặp đôi");
      expect(queryStrings).toContain("review món ăn Hà Nội hẹn hò");
      expect(queryStrings).toContain("review món ăn Hà Nội 2 người");

      // Intent templates
      expect(queryStrings.some((q) => q.includes("đi date Hà Nội"))).toBe(true);
      expect(queryStrings.some((q) => q.includes("địa điểm chill Hà Nội 2 người"))).toBe(true);
    });

    it("should support custom couple keywords", () => {
      const queries = crawler.generateSearchQueries("quán cafe", "Đà Lạt", ["view hoàng hôn", "riêng tư"]);
      const queryStrings = queries.map((q) => q.query);

      expect(queryStrings).toContain("review quán cafe Đà Lạt view hoàng hôn");
      expect(queryStrings).toContain("review quán cafe Đà Lạt riêng tư");
    });

    it("should generate group and family targeted queries when specified", () => {
      const groupQueries = crawler.generateSearchQueries("khu vui chơi", "Hà Nội", undefined, "group");
      const groupStrings = groupQueries.map((q) => q.query);
      expect(groupStrings.some((q) => q.includes("nhóm bạn"))).toBe(true);
      expect(groupStrings.some((q) => q.includes("khu vui chơi giải trí Hà Nội"))).toBe(true);

      const familyQueries = crawler.generateSearchQueries("quán ăn", "Hà Nội", undefined, "family");
      const familyStrings = familyQueries.map((q) => q.query);
      expect(familyStrings.some((q) => q.includes("gia đình"))).toBe(true);
    });
  });

  describe("isTargetCoupleVideo (Negative and Context Filtering)", () => {
    it("should reject junk, foreign travel, and gaming videos", () => {
      expect(
        crawler.isTargetCoupleVideo("Du lịch Nga tự túc mùa đông tuyết trắng", "Trải nghiệm Moskva và Saint Petersburg")
      ).toBe(false);

      expect(
        crawler.isTargetCoupleVideo("Khám phá ẩm thực Trung Quốc: Thượng Hải ăn gì?", "Vlog ẩm thực Trung Quốc")
      ).toBe(false);

      expect(
        crawler.isTargetCoupleVideo("Top 10 món ngon Thái Lan Bangkok", "Street food Bangkok ngon bổ rẻ")
      ).toBe(false);

      expect(
        crawler.isTargetCoupleVideo("Highlight Liên quân Mobile mùa giải mới", "Pha xử lý mãn nhãn")
      ).toBe(false);
    });

    it("should accept valid couple dating and food/cafe review videos in Hanoi", () => {
      expect(
        crawler.isTargetCoupleVideo(
          "Top 5 quán cafe view Hồ Tây cực chill cho các cặp đôi đi date cuối tuần",
          "Review quán cafe lãng mạn tại Tây Hồ, Hà Nội cho 2 người."
        )
      ).toBe(true);

      expect(
        crawler.isTargetCoupleVideo(
          "Gợi ý địa điểm hẹn hò lãng mạn tại Phố Cổ Hà Nội",
          "Tổng hợp các quán ăn ngon riêng tư cho các cặp đôi."
        )
      ).toBe(true);
    });
  });

  describe("crawlReviewsForInput (Dry Run mode)", () => {
    it("should generate mock couple videos adhering to schema when dryRun is true", async () => {
      const results = await crawler.crawlReviewsForInput({
        category: "Trà/Café",
        location: "Hà Nội",
        maxResultsPerQuery: 5,
      });

      expect(results.length).toBeGreaterThan(0);
      const first = results[0];
      expect(first.videoId).toBeDefined();
      expect(first.title).toContain("Hà Nội");
      expect(first.searchCategory).toBe("Trà/Café");
      expect(first.searchLocation).toBe("Hà Nội");
      expect(first.isEmbeddable).toBe(true);
    });
  });
});
