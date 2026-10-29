import { runTrackedPipeline } from "@/server/services/pipeline/pipeline-run.service";
import { loadCatalogVideos } from "@/server/services/videos/video-catalog.service";
import { assertPublishNotPaused } from "@/server/services/pipeline/pipeline-control.service";
import { db } from "@/server/db/client";
import { places, placeGuides, placeMedia, Place } from "@/server/db/schema/places";
import {
  candidatePlaces,
  placeBlocklist,
  placeVideos,
  PlaceBlocklist,
  CandidatePlace,
} from "@/server/db/schema/governance";
import { runOsmIngestion, HANOI_DISTRICTS } from "./osm-ingest";
import { assertNotBlocklisted } from "@/server/services/admin/governance.policy";
import { matchVideosWithPlaces, VideoForMatching, PlaceForMatching } from "@/server/services/matching/place-video.matcher";
import { autoPublishMatchedVideos } from "@/server/services/pipeline/auto-publish-videos.service";
import { revalidatePlaceCatalog } from "@/server/services/cache/revalidation";
import { eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import * as fs from "fs";
import * as path from "path";

// Kho ảnh minh họa chất lượng cao Unsplash cho từng thể loại
const CAFE_MEDIA_POOL = [
  {
    url: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80",
    caption: "Không gian cà phê phong cách mộc ấm cúng và lãng mạn",
    credit: "Daiki Ferrera / Unsplash",
  },
  {
    url: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80",
    caption: "Góc bàn đôi bên khung cửa sổ ngập tràn ánh nắng",
    credit: "Petr Sevcovic / Unsplash",
  },
  {
    url: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80",
    caption: "Tách cà phê thủ công thơm lừng cho buổi hẹn đầu",
    credit: "Nathan Dumlao / Unsplash",
  },
  {
    url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
    caption: "Ánh đèn vàng dịu êm cho những cuộc trò chuyện sâu lắng",
    credit: "Jason Leung / Unsplash",
  },
  {
    url: "https://images.unsplash.com/photo-1445116572660-238413488f6a?auto=format&fit=crop&w=1200&q=80",
    caption: "Khoảng sân vườn xanh mát và yên bình giữa lòng phố",
    credit: "Kari Shea / Unsplash",
  },
  {
    url: "https://images.unsplash.com/photo-1559925393-8be0ec4767c8?auto=format&fit=crop&w=1200&q=80",
    caption: "Quán cà phê tầng thượng view ngắm hoàng hôn cực chill",
    credit: "Alisa Anton / Unsplash",
  },
];

const RESTAURANT_MEDIA_POOL = [
  {
    url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
    caption: "Không gian ẩm thực tinh tế, ấm áp cho bữa tối kỷ niệm",
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
  {
    url: "https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&w=1200&q=80",
    caption: "Góc ngồi riêng tư, yên tĩnh bên thực đơn phong phú",
    credit: "Roman Bozhko / Unsplash",
  },
  {
    url: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80",
    caption: "Không gian ẩm thực hiện đại ngập tràn cảm hứng",
    credit: "Jay Wennington / Unsplash",
  },
];

const FUN_MEDIA_POOL = [
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
  {
    url: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80",
    caption: "Không gian nghệ thuật sống động, ánh sáng ấn tượng",
    credit: "Steve Johnson / Unsplash",
  },
];

const NATURE_MEDIA_POOL = [
  {
    url: "https://images.unsplash.com/photo-1470246973918-29a93221c455?auto=format&fit=crop&w=1200&q=80",
    caption: "Khung cảnh cắm trại dã ngoại yên bình ven hồ ngoại ô",
    credit: "Unsplash Camping Outdoor",
  },
  {
    url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
    caption: "Thiên nhiên trong lành và không gian khoáng đạt",
    credit: "Unsplash Nature",
  },
  {
    url: "https://images.unsplash.com/photo-1518998053901-5348d3961a04?auto=format&fit=crop&w=1200&q=80",
    caption: "Khuôn viên xanh mát lý tưởng cho buổi dạo mát thư giãn",
    credit: "Eric Park / Unsplash",
  },
];

function determineArea(candidate: CandidatePlace): string {
  const text = `${candidate.address} ${candidate.rawTags?.["addr:district"] || ""} ${candidate.rawTags?.["addr:street"] || ""}`.toLowerCase();

  if (text.includes("tây hồ") || text.includes("tay ho") || text.includes("quảng an") || text.includes("từ hoa") || text.includes("nhật chiêu") || text.includes("vệ hồ") || text.includes("yên phụ")) return "Tây Hồ";
  if (text.includes("hoàn kiếm") || text.includes("hoan kiem") || text.includes("hàng") || text.includes("nhà thờ") || text.includes("tống duy tân") || text.includes("tràng tiền") || text.includes("lý thái tổ")) return "Hoàn Kiếm";
  if (text.includes("ba đình") || text.includes("ba dinh") || text.includes("liễu giai") || text.includes("trúc bạch") || text.includes("nguyễn trường tộ") || text.includes("quán thánh") || text.includes("đội cấn") || text.includes("kim mã")) return "Ba Đình";
  if (text.includes("đống đa") || text.includes("dong da") || text.includes("chùa bộc") || text.includes("thái hà") || text.includes("ô chợ dừa") || text.includes("hoàng cầu") || text.includes("láng")) return "Đống Đa";
  if (text.includes("cầu giấy") || text.includes("cau giay") || text.includes("xuân thủy") || text.includes("duy tân") || text.includes("trung hòa") || text.includes("nguyễn khang") || text.includes("trần thái tông")) return "Cầu Giấy";
  if (text.includes("hai bà trưng") || text.includes("hai ba trung") || text.includes("bà triệu") || text.includes("phố huế") || text.includes("lê đại hành") || text.includes("bạch mai") || text.includes("đại cồ việt")) return "Hai Bà Trưng";
  if (text.includes("thanh xuân") || text.includes("thanh xuan") || text.includes("nguyễn trãi") || text.includes("ngụy như kon tum") || text.includes("hoàng đạo thúy")) return "Thanh Xuân";
  if (text.includes("hà đông") || text.includes("ha dong") || text.includes("quang trung") || text.includes("văn quán") || text.includes("mỗ lao")) return "Hà Đông";
  if (text.includes("nam từ liêm") || text.includes("mỹ đình") || text.includes("my dinh") || text.includes("mễ trì") || text.includes("lê đức thọ")) return "Nam Từ Liêm";
  if (text.includes("bắc từ liêm") || text.includes("cổ nhuế") || text.includes("xuân đỉnh")) return "Bắc Từ Liêm";
  if (text.includes("long biên") || text.includes("long bien") || text.includes("ngọc lâm") || text.includes("nguyễn văn cừ") || text.includes("bồ đề")) return "Long Biên";
  if (text.includes("hoàng mai") || text.includes("hoang mai") || text.includes("linh đàm") || text.includes("yên sở") || text.includes("định công")) return "Hoàng Mai";
  if (text.includes("gia lâm") || text.includes("gia lam") || text.includes("ocean park") || text.includes("bát tràng")) return "Gia Lâm";
  if (text.includes("sóc sơn") || text.includes("soc son") || text.includes("đồng đò") || text.includes("hàm lợn")) return "Sóc Sơn";
  if (text.includes("ba vì") || text.includes("ba vi") || text.includes("khoang xanh") || text.includes("tản đà")) return "Ba Vì";

  // Coordinates fallback
  const lat = Number(candidate.lat);
  const lng = Number(candidate.lng);
  if (lat >= 21.2) return "Sóc Sơn";
  if (lng <= 105.45) return "Ba Vì";
  if (lat >= 21.05) return "Tây Hồ";
  if (lng >= 105.865) return "Long Biên";
  if (lng >= 105.845) return "Hoàn Kiếm";
  if (lat >= 21.025) return "Ba Đình";
  if (lat <= 20.98) return "Hà Đông";
  if (lng <= 105.78) return "Nam Từ Liêm";
  return "Cầu Giấy";
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

async function main() {
  // Phanh publish (circuit breaker/admin/env) đang bật thì không chạy script xuất bản hàng loạt
  await assertPublishNotPaused();
  console.log("==================================================================");
  console.log("🌍 [DateMate Expansion Engine] CÀO & MỞ RỘNG ĐỊA ĐIỂM TOÀN DIỆN HÀ NỘI");
  console.log("==================================================================");

  const startTime = Date.now();

  // 1. Tải blocklist
  const blocklist: PlaceBlocklist[] = await db.select().from(placeBlocklist);
  console.log(`✓ Đã tải ${blocklist.length} quy tắc blocklist.`);

  // 2. CHẠY OSM INGEST CHO CÁC QUẬN MỚI
  // Ưu tiên quét các quận lớn chưa có đủ dữ liệu: Thanh Xuân, Hà Đông, Nam Từ Liêm, Long Biên, Hoàng Mai, Gia Lâm, Sóc Sơn, Ba Vì
  const targetDistrictsToScan = [
    "thanh_xuan",
    "ha_dong",
    "nam_tu_liem",
    "long_bien",
    "hoang_mai",
    "gia_lam",
    "cau_giay",
    "dong_da",
    "soc_son",
    "ba_vi",
  ];

  console.log(`\n--- [Giai đoạn 1] Cào OpenStreetMap cho ${targetDistrictsToScan.length} quận huyện mở rộng ---`);
  const osmResult = await runOsmIngestion({
    dryRun: false,
    delayMs: 2500,
    insertToDb: true,
    executor: db,
    districts: targetDistrictsToScan,
  });

  console.log(`=> Đã quét OSM thành công: tìm thấy ${osmResult.qualifyingCandidatesCount} ứng viên đạt chuẩn.`);

  // 3. LẤY TOÀN BỘ CANDIDATES CHƯA ĐƯỢC PROMOTE
  console.log("\n--- [Giai đoạn 2] Thẩm định & Thăng hạng toàn bộ ứng viên lên Official Places ---");
  const candidates: CandidatePlace[] = await db
    .select()
    .from(candidatePlaces)
    .where(eq(candidatePlaces.status, "pending"));

  console.log(`✓ Đang có ${candidates.length} ứng viên chờ thăng hạng.`);

  let promotedCount = 0;
  let skippedBlocklistCount = 0;
  const now = new Date();

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];

    // Kiểm tra Blocklist
    try {
      assertNotBlocklisted(
        {
          osmId: candidate.osmId,
          name: candidate.name,
          lat: Number(candidate.lat),
          lng: Number(candidate.lng),
        },
        blocklist
      );
    } catch {
      skippedBlocklistCount++;
      continue;
    }

    const area = determineArea(candidate);
    const catRaw = (candidate.category || "").toLowerCase();

    // Phân loại danh mục
    let category: "cafe" | "food" | "photo" | "nature" | "fun" | "walk" = "cafe";
    let mediaPool = CAFE_MEDIA_POOL;

    if (catRaw === "restaurant" || catRaw === "fast_food" || catRaw === "bakery" || catRaw === "ice_cream") {
      category = "food";
      mediaPool = RESTAURANT_MEDIA_POOL;
    } else if (
      catRaw === "gallery" ||
      catRaw === "museum" ||
      catRaw === "theatre" ||
      catRaw === "cinema" ||
      catRaw === "arts_centre"
    ) {
      category = "photo";
      mediaPool = FUN_MEDIA_POOL;
    } else if (
      catRaw === "park" ||
      catRaw === "garden" ||
      catRaw === "viewpoint" ||
      catRaw === "picnic_site"
    ) {
      category = "nature";
      mediaPool = NATURE_MEDIA_POOL;
    } else if (
      catRaw === "theme_park" ||
      catRaw === "zoo" ||
      catRaw === "aquarium" ||
      catRaw === "bowling_alley" ||
      catRaw === "amusement_arcade"
    ) {
      category = "fun";
      mediaPool = FUN_MEDIA_POOL;
    }

    const img1 = mediaPool[(i * 2) % mediaPool.length];
    const img2 = mediaPool[(i * 2 + 1) % mediaPool.length];
    const coverUrl = img1.url;

    const baseSlug = slugify(candidate.name) || "dia-diem-hen-ho";
    const slug = `${baseSlug}-${nanoid(6)}`;
    const newPlaceId = `plc_${nanoid(16)}`;

    const isFood = category === "food";
    const isFun = category === "fun" || category === "photo";
    const priceLevel = isFood ? 2 : isFun ? 3 : 1;
    const estCostMin = isFood ? 80000 : isFun ? 100000 : 35000;
    const estCostMax = isFood ? 250000 : isFun ? 350000 : 75000;

    const summary = isFood
      ? `Không gian ẩm thực ấm áp tại ${area}, thực đơn phong phú thích hợp cho buổi hẹn hò lãng mạn cùng người thương.`
      : isFun
      ? `Địa điểm vui chơi, trải nghiệm và chụp ảnh độc đáo tại ${area}, lý tưởng cho các cặp đôi và nhóm bạn khám phá cuối tuần.`
      : `Quán cà phê với không gian thư thái, view đẹp tại ${area}, điểm dừng chân lý tưởng để chuyện trò và lưu giữ khoảnh khắc.`;

    const moods = isFood
      ? ["lãng mạn", "ấm cúng", "ẩm thực"]
      : isFun
      ? ["vui vẻ", "trải nghiệm", "chụp ảnh"]
      : ["thư thái", "chụp ảnh", "tâm tình"];

    const tags = ["auto_promoted", "hanoi_places", category, area.toLowerCase()];

    // Thêm vào bảng places (Status: published)
    await db.insert(places).values({
      id: newPlaceId,
      slug,
      name: candidate.name,
      searchName: candidate.searchName || candidate.name.toLowerCase(),
      searchText: `${candidate.name} ${candidate.address} ${area}`,
      city: candidate.city || "hanoi",
      area,
      address: candidate.address || `Hà Nội (${area})`,
      lat: candidate.lat,
      lng: candidate.lng,
      category: category as any,
      priceLevel,
      estCostMin,
      estCostMax,
      moods,
      tags,
      indoor: category !== "nature",
      coverUrl,
      summary,
      status: "published",
      publishState: "published",
      tier: "B",
      batchId: "bulk_expand_v2",
      dateFit: isFood ? "romantic" : isFun ? "fun" : "chill",
      createdAt: now,
      updatedAt: now,
    });

    // Tạo Place Guide
    await db.insert(placeGuides).values({
      placeId: newPlaceId,
      bestTimes: [
        {
          label: isFood ? "Bữa tối lãng mạn" : isFun ? "Vui chơi trải nghiệm" : "Cà phê chuyện trò",
          start: isFood ? "18:30" : isFun ? "10:00" : "15:00",
          end: isFood ? "21:00" : isFun ? "17:00" : "18:00",
          type: "golden",
          note: isFood ? "Ánh đèn vàng lên màu đẹp nhất" : "Khoảng thời gian lý tưởng thư giãn",
        },
      ],
      bestWeekdays: [1, 2, 3, 4, 5],
      avoidWeekdays: [0, 6],
      crowdNotes: "Hợp đi: Các buổi tối ngày trong tuần. Tránh: Giờ cao điểm trưa hoặc tối thứ 7 đông đúc.",
      photoSpots: [
        {
          name: isFood ? "Góc bàn đôi bên ánh nến" : "Bàn đôi cạnh khung cửa kính nhìn ra phố",
          howToFind: "Khu vực tầng 1 hoặc tầng lửng của quán.",
          tip: "Chụp ngang tầm mắt, lấy trọn chiều sâu không gian quán.",
        },
      ],
      poses: [
        {
          title: "Cụng ly mừng ngày gặp gỡ",
          desc: "Hai người cùng mỉm cười nhìn nhau, bật chế độ chân dung xóa phông nhẹ nhàng.",
        },
      ],
      outfit: {
        palette: isFood ? ["#1D2D44", "#C93F52", "#FAF0CA"] : ["#FAF0CA", "#0D3B66", "#F4D35E"],
        tonSurTon: isFood ? "Trang phục thanh lịch, sơ mi hoặc đầm nhẹ." : "Phong cách trẻ trung pastel, tone màu kem be ấm.",
        contrast: "Áo sơ mi trắng kết hợp quần âu hoặc váy suông.",
        avoid: "Tránh trang phục dạ hội quá nặng nề hoặc đồ tập thể thao.",
        weatherTip: "Không gian máy lạnh mát mẻ, có thể mang theo áo khoác mỏng nếu ngồi lâu.",
      },
      tips: candidate.rawTags?.phone ? `Có thể gọi ${candidate.rawTags.phone} để đặt bàn trước.` : "Nên kiểm tra chỗ gửi xe trước quán khi tới.",
      sourceLinks: ["https://datemate.vn"],
    });

    // Gán 2 ảnh chất lượng cao vào placeMedia
    await db.insert(placeMedia).values({
      id: `med_${nanoid(16)}`,
      placeId: newPlaceId,
      type: "image",
      url: img1.url,
      platform: "unsplash",
      embedId: null,
      caption: `${candidate.name} - ${img1.caption}`,
      credit: img1.credit,
      sourceUrl: img1.url,
      licenseNote: "Unsplash License",
      license: "licensed",
      sortOrder: 0,
    });

    await db.insert(placeMedia).values({
      id: `med_${nanoid(16)}`,
      placeId: newPlaceId,
      type: "image",
      url: img2.url,
      platform: "unsplash",
      embedId: null,
      caption: `${candidate.name} - ${img2.caption}`,
      credit: img2.credit,
      sourceUrl: img2.url,
      licenseNote: "Unsplash License",
      license: "licensed",
      sortOrder: 1,
    });

    // Cập nhật candidate status = 'promoted'
    await db
      .update(candidatePlaces)
      .set({ status: "promoted", updatedAt: now })
      .where(eq(candidatePlaces.id, candidate.id));

    promotedCount++;
  }

  console.log(`=> Đã thăng hạng thành công ${promotedCount} địa điểm mới vào hệ thống!`);

  // 4. TỰ ĐỘNG SO KHỚP VỚI KHO VIDEO ĐANG CÓ
  console.log("\n--- [Giai đoạn 3] So khớp video review với các địa điểm mới ---");
  const rawVideos = await loadCatalogVideos();
  if (rawVideos.length > 0) {
    const allPublished: Place[] = await db.select().from(places).where(eq(places.status, "published"));

    const targets: PlaceForMatching[] = allPublished.map((p) => ({
      id: p.id,
      name: p.name,
      address: p.address,
      district: p.area || p.city,
    }));

    const vidsForMatch: VideoForMatching[] = rawVideos.map((v) => ({
      videoId: v.videoId,
      title: v.title,
      description: v.description,
      channelId: v.channelId,
      channelTitle: v.channelTitle,
      publishedAt: v.publishedAt,
    }));

    const matches = matchVideosWithPlaces(targets, vidsForMatch);
    for (const m of matches) {
      const vid = vidsForMatch.find((v) => v.videoId === m.videoId);
      await db
        .insert(placeVideos)
        .values({
          placeId: m.placeId,
          videoId: m.videoId,
          channelId: vid?.channelId,
          channelTitle: vid?.channelTitle,
          hasPaidPlacement: false,
          confidenceScore: m.score.toString(),
          status: m.score >= 65 ? "auto_linked" : "pending_review",
          publishedAt: vid?.publishedAt ? new Date(vid.publishedAt) : now,
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

    // Auto-publish media
    await autoPublishMatchedVideos({
      executor: db,
      minConfidence: 60,
      revalidate: false,
    });
  }

  // 5. REVALIDATE NEXT.JS CACHE
  console.log("\n--- [Giai đoạn 4] Revalidate Next.js Cache ---");
  try {
    revalidatePlaceCatalog();
    console.log("=> Cache Next.js revalidated thành công!");
  } catch {
    // CLI context
  }

  // 6. TỔNG KẾT SỐ LƯỢNG PLACES HIỆN TẠI
  const totalPlaces = await db.select({ count: sql`count(*)` }).from(places).where(eq(places.status, "published"));
  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("\n==================================================================");
  console.log(`🎉 [HOÀN TẤT CÀO & MỞ RỘNG ĐỊA ĐIỂM] Thời gian: ${durationSec}s`);
  console.log(`   - Địa điểm thăng hạng mới: ${promotedCount}`);
  console.log(`   - TỔNG SỐ TỌA ĐỘ HẸN HÒ HIỆN TẠI: ${totalPlaces[0]?.count || 0}`);
  console.log("==================================================================");
  return { promotedCount, summary: { promotedCount, durationSec: Number(durationSec) } };
}

runTrackedPipeline("osm_ingest", async () => {
  const { promotedCount, summary } = await main();
  return { result: undefined, promotedCount, summary };
}).catch((err) => {
  console.error("❌ Fatal Error in Expansion:", err);
  process.exit(1);
});
