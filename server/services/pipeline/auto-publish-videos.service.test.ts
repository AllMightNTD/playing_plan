import { describe, it, expect, vi } from "vitest";
import {
  classifyVideoCategory,
  evaluateVideoRecommend,
} from "@/server/services/user/videos.service";
import { loadRawVideos } from "@/server/services/pipeline/auto-publish-videos.service";

describe("Video Catalog Service & Categorisation", () => {
  describe("classifyVideoCategory", () => {
    it("should classify cafe keywords accurately", () => {
      expect(classifyVideoCategory("Khám phá quán cà phê rooftop view Hồ Tây cực chill")).toBe("cafe");
      expect(classifyVideoCategory("Tiệm bánh và trà chiều phong cách Pháp")).toBe("cafe");
      expect(classifyVideoCategory("Top 5 quán coffee làm việc yên tĩnh")).toBe("cafe");
    });

    it("should classify photo / check-in spots accurately", () => {
      expect(classifyVideoCategory("Check-in sống ảo mùa thu Hà Nội tại phố Phan Đình Phùng")).toBe("photo");
      expect(classifyVideoCategory("Săn hoàng hôn và chụp ảnh view triệu đô")).toBe("photo");
    });

    it("should classify walking / stroll spots accurately", () => {
      expect(classifyVideoCategory("Một buổi chiều đi dạo quanh hồ Tây ngắm gió thu")).toBe("walk");
      expect(classifyVideoCategory("Lang thang phố đi bộ đêm Hà Nội")).toBe("walk");
    });

    it("should classify fun & experience spots accurately", () => {
      expect(classifyVideoCategory("Trải nghiệm làm gốm Bát Tràng cùng người yêu")).toBe("fun");
      expect(classifyVideoCategory("Khám phá di tích Nhà tù Hỏa Lò về đêm")).toBe("fun");
    });

    it("should classify chill spots accurately", () => {
      expect(classifyVideoCategory("Cắm trại picnic cực chill tại bãi đá sông Hồng")).toBe("chill");
    });

    it("should default to food for food reviews", () => {
      expect(classifyVideoCategory("Ăn sập 17km quanh Hồ Tây - Bún ốc, phở cuốn, bánh tôm")).toBe("food");
      expect(classifyVideoCategory("Quán bún chả que tre 30 năm phố cổ")).toBe("food");
    });
  });

  describe("evaluateVideoRecommend", () => {
    it("should mark video as recommend if it has a linked place", () => {
      const result = evaluateVideoRecommend(
        {
          videoId: "test1",
          title: "Ăn bún chả",
          description: "Ngon",
          channelId: "c1",
          channelTitle: "Food Channel",
          viewCount: 1000,
          publishedAt: "2026-01-01",
          isEmbeddable: true,
        },
        true
      );
      expect(result.isRecommend).toBe(true);
      expect(result.reason).toContain("liên kết địa điểm");
    });

    it("should mark video as recommend if view count is >= 50,000", () => {
      const result = evaluateVideoRecommend(
        {
          videoId: "test2",
          title: "Vlog dạo phố",
          description: "Hay",
          channelId: "c2",
          channelTitle: "Random Vlogger",
          viewCount: 75000,
          publishedAt: "2026-01-01",
          isEmbeddable: true,
        },
        false
      );
      expect(result.isRecommend).toBe(true);
      expect(result.reason).toContain("triệu view");
    });

    it("should mark video as recommend for curated creators with >= 10,000 views", () => {
      const result = evaluateVideoRecommend(
        {
          videoId: "test3",
          title: "Quận ngon du ký",
          description: "Hà Nội",
          channelId: "c3",
          channelTitle: "Ninh Titô",
          viewCount: 15000,
          publishedAt: "2026-01-01",
          isEmbeddable: true,
        },
        false
      );
      expect(result.isRecommend).toBe(true);
    });

    it("should not recommend low-view generic videos without place link", () => {
      const result = evaluateVideoRecommend(
        {
          videoId: "test4",
          title: "Video test bình thường",
          description: "test",
          channelId: "c4",
          channelTitle: "Ẩn danh",
          viewCount: 500,
          publishedAt: "2026-01-01",
          isEmbeddable: true,
        },
        false
      );
      expect(result.isRecommend).toBe(false);
    });
  });

  describe("loadRawVideos", () => {
    it("should successfully load raw videos from json file", () => {
      const videos = loadRawVideos();
      expect(videos.length).toBeGreaterThan(0);
      expect(videos[0]).toHaveProperty("videoId");
      expect(videos[0]).toHaveProperty("title");
      expect(videos[0]).toHaveProperty("channelTitle");
      expect(videos[0]).toHaveProperty("isEmbeddable");
    });
  });
});
