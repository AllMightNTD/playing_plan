import { describe, expect, it } from "vitest";
import { formatCostRange, toCatalogPlace, toPlaceMediaItem } from "./catalog.mapper";
import type { Place, PlaceMedia } from "@/server/db/schema";

describe("catalog.mapper", () => {
  it("formatCostRange định dạng đúng khoảng giá tiền", () => {
    expect(formatCostRange(0, 0)).toBe("Miễn phí");
    expect(formatCostRange(50000, 100000)).toBe("50k - 100k");
  });

  it("toPlaceMediaItem chuẩn hóa credit cho Unsplash", () => {
    const unsplashMedia: PlaceMedia = {
      id: "m1",
      placeId: "p1",
      type: "image",
      url: "https://images.unsplash.com/sample",
      platform: "unsplash",
      embedId: "abc",
      caption: "Cầu Long Biên",
      credit: "Nguyen Van A",
      sourceUrl: "https://unsplash.com/photos/abc",
      licenseNote: "Unsplash License",
      license: "licensed",
      sortOrder: 0,
    };

    const mapped = toPlaceMediaItem(unsplashMedia);
    expect(mapped.credit).toBe("Nguyen Van A / Unsplash");
    expect(mapped.platform).toBe("unsplash");
    expect(mapped.type).toBe("image");
  });

  it("toCatalogPlace gán coverUrl và media từ danh sách PlaceMedia", () => {
    const place: Place = {
      id: "p1",
      slug: "cau-long-bien",
      name: "Cầu Long Biên",
      searchName: "cau long bien",
      searchText: "cau long bien",
      city: "hanoi",
      area: "Hoàn Kiếm",
      address: "Cầu Long Biên",
      lat: "21.0436",
      lng: "105.8594",
      category: "photo",
      priceLevel: 1,
      estCostMin: 0,
      estCostMax: 10000,
      moods: ["photo", "chill"],
      tags: [],
      indoor: false,
      coverUrl: "https://images.unsplash.com/cover.jpg",
      summary: "Cầu lịch sử",
      openingHours: null,
      status: "published",
      viewCount: 0,
      displayName: null,
      tier: "A",
      batchId: null,
      publishState: "published",
      dateFit: "chill",
      lastVerifiedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mediaList: PlaceMedia[] = [
      {
        id: "m1",
        placeId: "p1",
        type: "image",
        url: "https://images.unsplash.com/img1.jpg",
        platform: "unsplash",
        embedId: "123",
        caption: "Ảnh 1",
        credit: "Tran B",
        sourceUrl: "https://unsplash.com/123",
        licenseNote: "Unsplash License",
        license: "licensed",
        sortOrder: 0,
      },
    ];

    const catalog = toCatalogPlace(place, null, mediaList);
    expect(catalog.coverUrl).toBe("https://images.unsplash.com/cover.jpg");
    expect(catalog.media.length).toBe(1);
    expect(catalog.media[0].id).toBe("m1");
    expect(catalog.media[0].credit).toBe("Tran B / Unsplash");
  });

  it("toCatalogPlace fallback coverUrl sang media[0].url nếu place.coverUrl rỗng", () => {
    const place: Place = {
      id: "p2",
      slug: "ho-hoan-kiem",
      name: "Hồ Hoàn Kiếm",
      searchName: "ho hoan kiem",
      searchText: "ho hoan kiem",
      city: "hanoi",
      area: "Hoàn Kiếm",
      address: "Hồ Hoàn Kiếm",
      lat: "21.0285",
      lng: "105.8542",
      category: "walk",
      priceLevel: 1,
      estCostMin: 0,
      estCostMax: 0,
      moods: ["romantic"],
      tags: [],
      indoor: false,
      coverUrl: "",
      summary: "Trái tim Hà Nội",
      openingHours: null,
      status: "published",
      viewCount: 0,
      displayName: null,
      tier: "A",
      batchId: null,
      publishState: "published",
      dateFit: "chill",
      lastVerifiedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mediaList: PlaceMedia[] = [
      {
        id: "m2",
        placeId: "p2",
        type: "image",
        url: "https://thumb.wikimedia.org/img2.jpg",
        platform: "wikimedia",
        embedId: null,
        caption: "Ảnh Tháp Rùa",
        credit: "Wikimedia Author",
        sourceUrl: "https://commons.wikimedia.org",
        licenseNote: "CC BY 3.0",
        license: "licensed",
        sortOrder: 0,
      },
    ];

    const catalog = toCatalogPlace(place, null, mediaList);
    expect(catalog.coverUrl).toBe("https://thumb.wikimedia.org/img2.jpg");
    expect(catalog.media.length).toBe(1);
  });
});
