import { db } from "@/server/db/client";
import { places, placeMedia, Place } from "@/server/db/schema/places";
import { placeVideos, PlaceVideo } from "@/server/db/schema/governance";
import { loadRawVideos, RawVideoItem } from "@/server/services/pipeline/auto-publish-videos.service";
import { eq, inArray } from "drizzle-orm";

export type VideoCategory = "cafe" | "food" | "photo" | "walk" | "fun" | "chill" | "stay";

export interface VideoPlaceInfo {
  id: string;
  name: string;
  slug: string;
  category: string;
  area: string;
  address: string;
}

export interface VideoCatalogItem {
  id: string;
  embedId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  channelTitle: string;
  channelId: string;
  viewCount: number;
  likeCount: number;
  publishedAt: string;
  category: VideoCategory;
  categoryLabel: string;
  location?: string;
  isRecommend: boolean;
  recommendReason?: string;
  place: VideoPlaceInfo | null;
}

export interface VideoCatalogFilters {
  q?: string;
  category?: string;
  tab?: "all" | "recommend" | "popular" | "latest";
  channel?: string;
  page?: number;
  limit?: number;
}

export interface VideoCatalogResponse {
  items: VideoCatalogItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  categories: Array<{ id: string; label: string; count: number }>;
  channels: Array<{ title: string; count: number }>;
}

export const VIDEO_CATEGORY_LABELS: Record<VideoCategory, string> = {
  cafe: "Cà phê & Trà",
  food: "Ẩm thực & Món ngon",
  chill: "Không gian chill",
  photo: "Sống ảo & View đẹp",
  stay: "Khách sạn & Homestay",
  walk: "Đi dạo ngắm cảnh",
  fun: "Vui chơi & Trải nghiệm",
};

/**
 * Phân loại danh mục video dựa trên tiêu đề, mô tả, tên kênh và từ khóa tìm kiếm
 */
export function classifyVideoCategory(
  title: string,
  description: string = "",
  channelTitle: string = "",
  searchCategory: string = ""
): VideoCategory {
  const text = `${title} ${description} ${channelTitle} ${searchCategory}`.toLowerCase();

  // 1. Khách sạn & Homestay (Staycation lãng mạn)
  if (/homestay|khách sạn|hotel|resort|bungalow|nghỉ dưỡng|staycation|phòng đôi/.test(text)) {
    return "stay";
  }

  // 2. Cà phê & Trà
  if (
    /cà phê|cafe|coffee|tiệm bánh|trà sữa|rooftop|matcha|quán nước|nước ép|brunch|trà chiều/.test(text)
  ) {
    return "cafe";
  }

  // 3. Chụp ảnh & Sống ảo
  if (
    /check-in|checkin|sống ảo|chụp ảnh|view đẹp|hoàng hôn|bình minh|săn mây|phố phan đình phùng|vườn hoa|thảo nguyên hoa/.test(
      text
    )
  ) {
    return "photo";
  }

  // 4. Chill & Thư giãn
  if (
    /chill|yên tĩnh|cắm trại|picnic|glamping|thư giãn|sông hồng|bãi đá|bình yên|mùa thu/.test(
      text
    )
  ) {
    return "chill";
  }

  // 5. Vui chơi & Trải nghiệm
  if (
    /trải nghiệm|vui chơi|workshop|làm gốm|bát tràng|bảo tàng|di tích|hỏa lò|lotte sky|top of hanoi|game|giải trí|đi chơi|đi date/.test(
      text
    )
  ) {
    return "fun";
  }

  // 6. Đi dạo & Ngắm cảnh
  if (
    /đi dạo|dạo phố|lang thang|quanh hồ|xe đạp|phố đi bộ|lượn phố|hồ tây|cầu long biên|phố cổ/.test(
      text
    ) &&
    !/ăn sập|quán ăn|món ngon|bún|phở/.test(title.toLowerCase())
  ) {
    return "walk";
  }

  // 7. Ẩm thực (Mặc định cho các kênh food / review món ăn)
  return "food";
}

/**
 * Đánh giá tính đề xuất của video cho cặp đôi
 */
export function evaluateVideoRecommend(
  video: RawVideoItem,
  hasLinkedPlace: boolean
): { isRecommend: boolean; reason?: string } {
  if (hasLinkedPlace) {
    return {
      isRecommend: true,
      reason: "Đã liên kết địa điểm hẹn hò thực tế",
    };
  }

  const titleLower = video.title.toLowerCase();

  if (
    /hẹn hò|cặp đôi|lãng mạn|quận ngon du ký|đi hồ tây|siêu đẹp|cực chill|view triệu đô|hoàng hôn/.test(
      titleLower
    )
  ) {
    return {
      isRecommend: true,
      reason: "Gợi ý hàng đầu cho buổi hẹn hò",
    };
  }

  if (video.viewCount >= 50000) {
    return {
      isRecommend: true,
      reason: `Video triệu view (${Math.round(video.viewCount / 1000)}k lượt xem)`,
    };
  }

  if (
    (video.channelTitle === "Ninh Titô" || video.channelTitle === "Khoai Lang Thang") &&
    video.viewCount >= 10000
  ) {
    return {
      isRecommend: true,
      reason: `Tuyển chọn từ reviewer ${video.channelTitle}`,
    };
  }

  return { isRecommend: false };
}

/**
 * Lấy toàn bộ danh mục video phong phú cho End-User
 */
export async function queryUserVideos(
  filters: VideoCatalogFilters = {}
): Promise<VideoCatalogResponse> {
  const { q = "", category = "all", tab = "all", channel = "all", page = 1, limit = 24 } = filters;

  // 1. Tải danh sách raw videos
  const rawVideos = loadRawVideos();

  // 2. Tải địa điểm chính thức và bảng liên kết place_videos từ DB (nếu có)
  let placeMap = new Map<string, VideoPlaceInfo>();
  let videoPlaceLinkMap = new Map<string, string>(); // videoId -> placeId

  try {
    const allPlaces = await db
      .select({
        id: places.id,
        name: places.name,
        slug: places.slug,
        category: places.category,
        area: places.area,
        address: places.address,
      })
      .from(places)
      .where(eq(places.status, "published"));

    for (const p of allPlaces) {
      placeMap.set(p.id, p);
    }

    // Lấy liên kết place_videos
    const pvRows = await db
      .select({
        placeId: placeVideos.placeId,
        videoId: placeVideos.videoId,
        status: placeVideos.status,
      })
      .from(placeVideos);

    for (const row of pvRows) {
      if (placeMap.has(row.placeId) && row.status !== "rejected") {
        videoPlaceLinkMap.set(row.videoId, row.placeId);
      }
    }
  } catch (err) {
    console.warn("[VideoService] Không thể tải place mapping từ DB, dùng catalog độc lập:", err);
  }

  // 3. Chuẩn hóa & gắn metadata cho từng video
  const catalogItems: VideoCatalogItem[] = rawVideos
    .filter((v) => v.isEmbeddable)
    .map((v) => {
      const placeId = videoPlaceLinkMap.get(v.videoId);
      const place = placeId ? placeMap.get(placeId) || null : null;
      const cat = classifyVideoCategory(v.title, v.description, v.channelTitle, v.searchCategory);
      const rec = evaluateVideoRecommend(v, Boolean(place));

      return {
        id: v.videoId,
        embedId: v.videoId,
        title: v.title,
        description: v.description,
        thumbnailUrl: `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
        channelTitle: v.channelTitle,
        channelId: v.channelId,
        viewCount: v.viewCount || 0,
        likeCount: v.likeCount || 0,
        publishedAt: v.publishedAt || new Date().toISOString(),
        category: cat,
        categoryLabel: VIDEO_CATEGORY_LABELS[cat],
        location: v.searchLocation || "Hà Nội",
        isRecommend: rec.isRecommend,
        recommendReason: rec.reason,
        place,
      };
    });

  // 4. Tính toán thống kê Channels và Categories
  const channelCountMap = new Map<string, number>();
  const categoryCountMap = new Map<string, number>();

  catalogItems.forEach((item) => {
    channelCountMap.set(item.channelTitle, (channelCountMap.get(item.channelTitle) || 0) + 1);
    categoryCountMap.set(item.category, (categoryCountMap.get(item.category) || 0) + 1);
  });

  const channels = Array.from(channelCountMap.entries())
    .map(([title, count]) => ({ title, count }))
    .sort((a, b) => b.count - a.count);

  const categories = (
    Object.keys(VIDEO_CATEGORY_LABELS) as VideoCategory[]
  ).map((catKey) => ({
    id: catKey,
    label: VIDEO_CATEGORY_LABELS[catKey],
    count: categoryCountMap.get(catKey) || 0,
  }));

  // 5. Áp dụng Bộ lọc (Filtering)
  let filtered = [...catalogItems];

  // Tìm kiếm theo từ khóa
  if (q.trim()) {
    const searchNorm = q.trim().toLowerCase();
    filtered = filtered.filter(
      (item) =>
        item.title.toLowerCase().includes(searchNorm) ||
        item.channelTitle.toLowerCase().includes(searchNorm) ||
        (item.place && item.place.name.toLowerCase().includes(searchNorm)) ||
        (item.place && item.place.address.toLowerCase().includes(searchNorm))
    );
  }

  // Lọc theo Category
  if (category && category !== "all") {
    filtered = filtered.filter((item) => item.category === category);
  }

  // Lọc theo Channel
  if (channel && channel !== "all") {
    filtered = filtered.filter((item) => item.channelTitle === channel);
  }

  // Lọc theo Tab / Sắp xếp
  if (tab === "recommend") {
    filtered = filtered.filter((item) => item.isRecommend);
    // Sắp xếp ưu tiên có place trước, sau đó theo views
    filtered.sort((a, b) => {
      if (a.place && !b.place) return -1;
      if (!a.place && b.place) return 1;
      return b.viewCount - a.viewCount;
    });
  } else if (tab === "popular") {
    filtered.sort((a, b) => b.viewCount - a.viewCount);
  } else if (tab === "latest") {
    filtered.sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
  } else {
    // Mặc định: ưu tiên recommend và lượt xem cao
    filtered.sort((a, b) => {
      if (a.isRecommend && !b.isRecommend) return -1;
      if (!a.isRecommend && b.isRecommend) return 1;
      return b.viewCount - a.viewCount;
    });
  }

  // 6. Phân trang (Pagination)
  const total = filtered.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const startIndex = (page - 1) * limit;
  const paginatedItems = filtered.slice(startIndex, startIndex + limit);

  return {
    items: paginatedItems,
    total,
    page,
    limit,
    totalPages,
    categories,
    channels,
  };
}
