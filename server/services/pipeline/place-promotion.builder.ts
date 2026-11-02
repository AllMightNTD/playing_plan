import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import type { PlaceCategory } from "@/lib/constants/catalog";
import { getCuratedUnsplashGalleryForPlace } from "@/lib/media/unsplash-gallery-pool";
import { toSlug } from "@/lib/search";
import type { DbExecutor } from "@/server/db/client";
import {
  candidatePlaces,
  type CandidatePlace,
  type PlaceVideo,
} from "@/server/db/schema/governance";
import {
  placeGuides,
  placeMedia,
  places,
  type NewPlace,
  type NewPlaceGuide,
  type NewPlaceMedia,
} from "@/server/db/schema/places";
import { classifyDateFit } from "./shadow-worker";

export interface BuildPromotedPlaceOptions {
  batchId?: string | null;
  tier?: "A" | "B" | "C";
  summaryOverride?: string;
  outfitTipOverride?: string;
  moodsOverride?: string[];
  linkedVideos?: PlaceVideo[];
  now?: Date;
}

export interface PromotedPlaceBundle {
  candidateId: string;
  batchId: string | null;
  now: Date;
  place: NewPlace;
  guide: NewPlaceGuide;
  media: NewPlaceMedia[];
}

const DISTRICT_PATTERNS: ReadonlyArray<{ area: string; keywords: readonly string[] }> = [
  {
    area: "Tây Hồ",
    keywords: ["tây hồ", "tay ho", "quảng an", "từ hoa", "nhật chiêu", "vệ hồ", "yên phụ", "trích sài", "thụy khuê"],
  },
  {
    area: "Hoàn Kiếm",
    keywords: ["hoàn kiếm", "hoan kiem", "nhà thờ", "tống duy tân", "tràng tiền", "lý thái tổ", "hàng trống", "phố cổ", "đinh liệt"],
  },
  {
    area: "Ba Đình",
    keywords: ["ba đình", "ba dinh", "liễu giai", "trúc bạch", "nguyễn trường tộ", "quán thánh", "đội cấn", "kim mã", "phan đình phùng"],
  },
  {
    area: "Đống Đa",
    keywords: ["đống đa", "dong da", "chùa bộc", "thái hà", "ô chợ dừa", "hoàng cầu", "đặng văn ngữ", "tôn đức thắng"],
  },
  {
    area: "Cầu Giấy",
    keywords: ["cầu giấy", "cau giay", "xuân thủy", "duy tân", "trung hòa", "nghĩa tân", "trần thái tông"],
  },
  {
    area: "Hai Bà Trưng",
    keywords: ["hai bà trưng", "hai ba trung", "bà triệu", "phố huế", "lê đại hành", "triệu việt vương", "bùi thị xuân"],
  },
  {
    area: "Thanh Xuân",
    keywords: ["thanh xuân", "thanh xuan", "nguyễn trãi", "khuất duy tiến", "lê văn lương"],
  },
  {
    area: "Hoàng Mai",
    keywords: ["hoàng mai", "hoang mai", "linh đàm", "định công", "giải phóng"],
  },
  {
    area: "Long Biên",
    keywords: ["long biên", "long bien", "ngọc thụy", "cổ linh", "nguyễn văn cừ"],
  },
  {
    area: "Nam Từ Liêm",
    keywords: ["nam từ liêm", "nam tu liem", "mỹ đình", "mễ trì"],
  },
  {
    area: "Bắc Từ Liêm",
    keywords: ["bắc từ liêm", "bac tu liem", "ngoại giao đoàn", "phạm văn đồng"],
  },
  {
    area: "Hà Đông",
    keywords: ["hà đông", "ha dong", "văn quán", "mộ lao", "dương nội"],
  },
];

export function resolveHanoiArea(
  address: string,
  rawTags: Record<string, string> = {},
  lat?: number,
  lng?: number
): string {
  const combined = `${address} ${rawTags["addr:district"] ?? ""} ${rawTags["addr:subdistrict"] ?? ""} ${rawTags["addr:street"] ?? ""}`
    .toLowerCase()
    .replace(/_/g, " ");

  for (const entry of DISTRICT_PATTERNS) {
    if (entry.keywords.some((kw) => combined.includes(kw))) {
      return entry.area;
    }
  }

  if (typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng)) {
    if (lat <= 20.98 && lng <= 105.79) return "Hà Đông";
    if (lng >= 105.87) return "Long Biên";
  }

  return "Hà Nội";
}

export function mapCandidateCategory(
  rawCategory: string,
  rawTags: Record<string, string> = {}
): PlaceCategory {
  const norm = `${rawCategory} ${rawTags.amenity ?? ""} ${rawTags.tourism ?? ""} ${rawTags.leisure ?? ""}`.toLowerCase();

  if (norm.includes("restaurant") || norm.includes("food") || norm.includes("bakery") || norm.includes("bistro")) {
    return "food";
  }
  if (norm.includes("bar") || norm.includes("pub") || norm.includes("cinema") || norm.includes("arcade") || norm.includes("fun") || norm.includes("workshop")) {
    return "fun";
  }
  if (norm.includes("park") || norm.includes("garden") || norm.includes("picnic") || norm.includes("nature")) {
    return "nature";
  }
  if (norm.includes("viewpoint") || norm.includes("photo")) {
    return "photo";
  }
  if (norm.includes("museum") || norm.includes("gallery") || norm.includes("indoor") || norm.includes("arts_centre")) {
    return "indoor";
  }
  if (norm.includes("walk") || norm.includes("promenade")) {
    return "walk";
  }
  return "cafe";
}

export function buildPromotedPlaceBundle(
  candidate: CandidatePlace,
  options: BuildPromotedPlaceOptions = {}
): PromotedPlaceBundle {
  const now = options.now ?? new Date();
  const rawTags = candidate.rawTags ?? {};
  const category = mapCandidateCategory(candidate.category, rawTags);
  const area = resolveHanoiArea(
    candidate.address,
    rawTags,
    Number(candidate.lat),
    Number(candidate.lng)
  );
  const dateFit = candidate.evaluatedDateFit ?? classifyDateFit(candidate.name, rawTags);
  const tier = options.tier ?? candidate.evaluatedTier ?? "B";
  const batchId = options.batchId ?? candidate.batchId ?? null;

  const baseSlug = toSlug(candidate.name) || "dia-diem-hen-ho";
  const suffix = candidate.id.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toLowerCase() || nanoid(6).toLowerCase();
  const slug = `${baseSlug}-${suffix}`.slice(0, 120);

  const isFood = category === "food";
  const isOutdoor = category === "nature" || category === "walk" || category === "photo";
  const gallery = getCuratedUnsplashGalleryForPlace(category, candidate.id, 4);
  const coverUrl =
    gallery[0]?.url ??
    "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80";

  const summary = (
    options.summaryOverride?.trim() ||
    `${candidate.name} tại ${area}, không gian ${dateFit} ấm áp và lý tưởng cho buổi hẹn hò đôi.`
  ).slice(0, 300);

  const place: NewPlace = {
    id: candidate.id,
    slug,
    name: candidate.name,
    displayName: candidate.name,
    searchName: candidate.searchName || candidate.name.toLowerCase(),
    searchText: `${candidate.name} ${candidate.address} ${area}`,
    city: candidate.city || "hanoi",
    area,
    address: candidate.address,
    lat: candidate.lat,
    lng: candidate.lng,
    category,
    priceLevel: isFood ? 2 : 1,
    estCostMin: isFood ? 120_000 : 45_000,
    estCostMax: isFood ? 350_000 : 120_000,
    moods: options.moodsOverride?.length
      ? options.moodsOverride
      : isFood
        ? ["lãng mạn", "ấm cúng"]
        : ["chill", "lãng mạn"],
    tags: ["date-worthy", dateFit, category],
    indoor: !isOutdoor,
    coverUrl,
    summary,
    status: "published",
    publishState: "published",
    tier,
    batchId,
    dateFit,
    lastVerifiedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  const guide: NewPlaceGuide = {
    placeId: candidate.id,
    bestTimes: [
      {
        label: isFood ? "Buổi tối lãng mạn" : "Chiều hoàng hôn",
        start: isFood ? "18:00" : "16:00",
        end: isFood ? "21:00" : "21:30",
        type: "golden",
        note: "Khung giờ ánh sáng và không khí đẹp nhất cho cặp đôi",
      },
    ],
    bestWeekdays: [2, 3, 4, 0],
    avoidWeekdays: [6],
    crowdNotes: "Cuối tuần thường đông vào khung giờ cao điểm, nên đặt bàn hoặc ghé sớm 20 phút.",
    photoSpots: [
      {
        name: "Góc bàn đôi ánh sáng tự nhiên",
        howToFind: "Khu vực gần cửa kính hoặc ban công thoáng",
        tip: "Chụp góc nghiêng 45 độ lúc nắng chiều dịu.",
      },
    ],
    poses: [
      {
        title: "Tương tác tự nhiên đối diện bàn",
        desc: "Trò chuyện tự nhiên và bật chế độ chân dung xóa phông nhẹ.",
      },
    ],
    outfit: {
      palette: isFood ? ["#1D2D44", "#C93F52", "#FAF0CA"] : ["#FAF0CA", "#0D3B66", "#F4D35E"],
      tonSurTon:
        options.outfitTipOverride?.trim() ||
        (isFood
          ? "Trang phục thanh lịch, sơ mi hoặc đầm nhẹ."
          : "Phong cách smart-casual trẻ trung, tone kem hoặc pastel."),
      contrast: "Sơ mi sáng màu phối quần tối màu hoặc chân váy chữ A.",
      avoid: "Tránh trang phục quá xuề xòa hoặc đồ tập thể thao.",
      weatherTip: isOutdoor
        ? "Theo dõi dự báo thời tiết trước khi đi và mang theo ô nhỏ."
        : "Không gian điều hòa mát mẻ, có thể mang theo áo khoác mỏng.",
    },
    tips: "Nên kiểm tra fanpage hoặc liên hệ quán trước nếu đi vào tối cuối tuần.",
    sourceLinks: [],
  };

  const media: NewPlaceMedia[] = gallery.map((photo, index) => ({
    id: `med_${nanoid(16)}`,
    placeId: candidate.id,
    type: "image",
    url: photo.url,
    platform: "unsplash",
    embedId: null,
    caption: `${candidate.name} - ${photo.caption}`.slice(0, 200),
    credit: photo.credit.slice(0, 200),
    sourceUrl: photo.url,
    licenseNote: "Unsplash Free License",
    license: "licensed",
    sortOrder: index,
  }));

  const seenVideoIds = new Set<string>();
  for (const vid of options.linkedVideos ?? []) {
    if (vid.status !== "auto_linked" && vid.status !== "verified") continue;
    if (seenVideoIds.has(vid.videoId)) continue;
    seenVideoIds.add(vid.videoId);
    media.push({
      id: `med_${nanoid(16)}`,
      placeId: candidate.id,
      type: "video",
      url: `https://www.youtube.com/watch?v=${vid.videoId}`,
      platform: "youtube",
      embedId: vid.videoId,
      caption: `Video review từ kênh ${vid.channelTitle || "YouTube"}`.slice(0, 200),
      credit: (vid.channelTitle || "YouTube Creator").slice(0, 200),
      sourceUrl: `https://www.youtube.com/watch?v=${vid.videoId}`,
      licenseNote: "Nhúng YouTube chính thức từ reviewer ẩm thực/du lịch",
      license: "embed_only",
      sortOrder: 10 + seenVideoIds.size - 1,
    });
  }

  return {
    candidateId: candidate.id,
    batchId,
    now,
    place,
    guide,
    media,
  };
}

/**
 * Persists a promoted candidate bundle sequentially so transaction connections on TiDB Serverless never interleave.
 */
export async function persistPromotedPlaceBundle(
  executor: DbExecutor,
  bundle: PromotedPlaceBundle
): Promise<void> {
  const placeInsert = executor.insert(places).values(bundle.place);
  if (typeof placeInsert.onDuplicateKeyUpdate === "function") {
    await placeInsert.onDuplicateKeyUpdate({
      set: {
        status: "published",
        publishState: "published",
        tier: bundle.place.tier,
        batchId: bundle.batchId,
        updatedAt: bundle.now,
      },
    });
  } else {
    await placeInsert;
  }

  const guideInsert = executor.insert(placeGuides).values(bundle.guide);
  if (typeof guideInsert.onDuplicateKeyUpdate === "function") {
    await guideInsert.onDuplicateKeyUpdate({
      set: {
        tips: bundle.guide.tips,
      },
    });
  } else {
    await guideInsert;
  }

  for (const item of bundle.media) {
    await executor.insert(placeMedia).values(item);
  }

  await executor
    .update(candidatePlaces)
    .set({
      status: "promoted",
      ...(bundle.batchId ? { batchId: bundle.batchId } : {}),
      updatedAt: bundle.now,
    })
    .where(eq(candidatePlaces.id, bundle.candidateId));
}
