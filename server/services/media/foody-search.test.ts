import { describe, expect, it, vi } from "vitest";
import { buildFoodySearchQuery, searchFoodyImages } from "./foody-search";

describe("foody-search", () => {
  describe("buildFoodySearchQuery", () => {
    it("builds domain-targeted query for Foody, ShopeeFood, and Riviu", () => {
      const q = buildFoodySearchQuery({ name: "Aha Coffee", area: "Cầu Giấy" });
      expect(q).toContain("Aha Coffee");
      expect(q).toContain("Cầu Giấy");
      expect(q).toContain("Hà Nội");
      expect(q).toContain("(site:foody.vn OR site:shopeefood.vn OR site:riviu.vn)");
    });

    it("does not repeat Hà Nội if already present in name or area", () => {
      const q = buildFoodySearchQuery({ name: "Hà Nội Phố Cafe" });
      const matches = q.match(/Hà Nội/gi);
      expect(matches?.length).toBe(1);
    });
  });

  describe("searchFoodyImages", () => {
    it("extracts vqd token and queries DuckDuckGo image JSON", async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => '<html><body><script>vqd="4-123456789";</script></body></html>',
        } as unknown as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            results: [
              {
                title: "Aha Cafe - Tô Hiệu | Foody.vn",
                image: "https://down-vn.img.susercontent.com/vn-11134259-7r98o-sample.jpg",
                thumbnail: "https://tse1.mm.bing.net/th?id=sample",
                url: "https://www.foody.vn/ha-noi/aha-cafe",
              },
              {
                title: "Insecure image (should be ignored)",
                image: "http://insecure.com/image.jpg",
                url: "https://www.foody.vn/ha-noi/aha-cafe",
              },
              {
                title: "Duplicate image (should be deduped)",
                image: "https://down-vn.img.susercontent.com/vn-11134259-7r98o-sample.jpg",
                url: "https://www.foody.vn/ha-noi/aha-cafe",
              },
            ],
          }),
        } as unknown as Response);

      const results = await searchFoodyImages("Aha Coffee Cầu Giấy", { fetchImpl: mockFetch as unknown as typeof fetch });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe("Aha Cafe - Tô Hiệu | Foody.vn");
      expect(results[0].imageUrl).toBe("https://down-vn.img.susercontent.com/vn-11134259-7r98o-sample.jpg");
      expect(results[0].pageUrl).toBe("https://www.foody.vn/ha-noi/aha-cafe");
    });

    it("throws clear error when vqd token is missing", async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => "<html><body>No token here</body></html>",
      } as unknown as Response);

      await expect(
        searchFoodyImages("Unknown place", { fetchImpl: mockFetch as unknown as typeof fetch })
      ).rejects.toThrow("Không trích xuất được token vqd");
    });
  });
});
