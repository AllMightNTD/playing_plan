import { getAllPublishedPlaces } from "@/server/services/user/places.service";
import { queryUserVideos } from "@/server/services/user/videos.service";
import type { HanoiPlace } from "@/lib/types/catalog";
import { AppError, ERRORS } from "@/server/http/errors";

export interface VideoHotspot {
  id: string;
  placeId: string;
  placeName: string;
  area: string;
  timestampSeconds: number;
  timeFormatted: string;
  category: string;
  categoryLabel: string;
  address?: string;
  position: { x: number; y: number }; // Tọa độ phần trăm (0-100%) trên khung hình video
}

export interface VideoHotspotsDetail {
  videoId: string;
  videoTitle: string;
  embedId: string | null;
  thumbnailUrl: string;
  hotspots: VideoHotspot[];
  nearbyPlaces: Array<{
    id: string;
    name: string;
    area: string;
    categoryLabel: string;
    costText: string;
  }>;
}

// 3 Video review tuyển chọn mẫu chuẩn Scrapbook cho Phase 3
export const CURATED_FEATURED_VIDEOS = [
  {
    id: "vid-long-bien",
    embedId: "W0qYvR8E6h0",
    title: "Hành trình 1 ngày săn hoàng hôn Cầu Long Biên & Hồ Tây",
    description: "Top các quán cà phê ngắm tàu chạy qua cầu Long Biên và dạo mát hồ Tây lãng mạn.",
    thumbnailUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=700&q=80",
    primaryPlaceId: "p1",
    timestamps: [
      { sec: 42, label: "00:42", x: 25, y: 35 },
      { sec: 95, label: "01:35", x: 65, y: 55 },
    ],
  },
  {
    id: "vid-song-hong",
    embedId: "d9Yw0Q7Jz0I",
    title: "Review Bãi đá sông Hồng mùa cỏ lau trắng muốt",
    description: "Bí kíp chụp ảnh film giờ vàng ngắm hoàng hôn tại Bãi đá sông Hồng.",
    thumbnailUrl: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=700&q=80",
    primaryPlaceId: "p2",
    timestamps: [
      { sec: 30, label: "00:30", x: 30, y: 40 },
      { sec: 110, label: "01:50", x: 70, y: 30 },
      { sec: 165, label: "02:45", x: 50, y: 60 },
    ],
  },
  {
    id: "vid-indoor-rain",
    embedId: "m_x1B2C3D4E",
    title: "Date trong nhà bất chấp mưa gió tại Bảo tàng & Bowling",
    description: "Gợi ý Date Indoor mát lạnh khi Hà Nội bất chợt đổ mưa lớn.",
    thumbnailUrl: "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=700&q=80",
    primaryPlaceId: "p3",
    timestamps: [
      { sec: 20, label: "00:20", x: 40, y: 30 },
      { sec: 80, label: "01:20", x: 55, y: 65 },
    ],
  },
];

/**
 * Lấy chi tiết Pin Tags nổi và gợi ý cùng quận cho một video review
 */
export async function getVideoHotspots(videoId: string): Promise<VideoHotspotsDetail> {
  const [allPlaces, catalog] = await Promise.all([
    getAllPublishedPlaces(),
    queryUserVideos({ limit: 100 }),
  ]);

  const placeMap = new Map(allPlaces.map((p) => [p.id, p]));

  // 1. Tìm video trong danh sách tuyển chọn hoặc catalog
  const curated = CURATED_FEATURED_VIDEOS.find((v) => v.id === videoId || v.embedId === videoId);
  const catalogItem = catalog.items.find((i) => i.id === videoId || i.embedId === videoId);

  if (!curated && !catalogItem) {
    throw new AppError(ERRORS.PLACE.NOT_FOUND);
  }

  const title = curated?.title || catalogItem?.title || "Video Review Hẹn Hò Hà Nội";
  const embedId = curated?.embedId || catalogItem?.embedId || null;
  const thumbnailUrl =
    curated?.thumbnailUrl || catalogItem?.thumbnailUrl || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=700&q=80";

  // 2. Xác định các địa điểm liên kết với video
  const targetPlaceId = curated?.primaryPlaceId || catalogItem?.place?.id || allPlaces[0]?.id || "p1";
  const primaryPlace = placeMap.get(targetPlaceId) || allPlaces[0];

  // 3. Tạo danh sách Hotspot Pin Tags
  const hotspots: VideoHotspot[] = [];
  const timestamps = curated?.timestamps || [
    { sec: 42, label: "00:42", x: 30, y: 35 },
    { sec: 105, label: "01:45", x: 65, y: 55 },
  ];

  timestamps.forEach((ts, idx) => {
    // Có thể luân phiên trạm chính hoặc các trạm nearby
    const place = idx === 0 ? primaryPlace : allPlaces[idx % allPlaces.length] || primaryPlace;
    hotspots.push({
      id: `spot-${idx + 1}`,
      placeId: place.id,
      placeName: place.name,
      area: place.area,
      timestampSeconds: ts.sec,
      timeFormatted: ts.label,
      category: place.category,
      categoryLabel: place.categoryLabel,
      address: `Quận ${place.area}, Hà Nội`,
      position: { x: ts.x, y: ts.y },
    });
  });

  // 4. Tìm 2-3 địa điểm tương tự trong cùng quận để gợi ý
  const primaryArea = primaryPlace.area;
  const nearbyPlaces = allPlaces
    .filter((p) => p.id !== primaryPlace.id && p.area === primaryArea)
    .slice(0, 3)
    .map((p) => ({
      id: p.id,
      name: p.name,
      area: p.area,
      categoryLabel: p.categoryLabel,
      costText: p.costText,
    }));

  return {
    videoId,
    videoTitle: title,
    embedId,
    thumbnailUrl,
    hotspots,
    nearbyPlaces,
  };
}

/**
 * Lấy danh sách 3 video tuyển chọn nổi bật có gắn Pin Tags
 */
export async function listFeaturedVideosWithHotspots(): Promise<
  Array<{
    id: string;
    title: string;
    description: string;
    thumbnailUrl: string;
    pinCount: number;
    primaryPlaceName: string;
    area: string;
  }>
> {
  const places = await getAllPublishedPlaces();
  const placeMap = new Map(places.map((p) => [p.id, p]));

  return CURATED_FEATURED_VIDEOS.map((v) => {
    const p = placeMap.get(v.primaryPlaceId) || places[0];
    return {
      id: v.id,
      title: v.title,
      description: v.description,
      thumbnailUrl: v.thumbnailUrl,
      pinCount: v.timestamps.length,
      primaryPlaceName: p?.name || "Điểm hẹn Hà Nội",
      area: p?.area || "Hà Nội",
    };
  });
}
