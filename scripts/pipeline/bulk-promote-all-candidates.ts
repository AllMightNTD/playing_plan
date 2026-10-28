import { db } from "@/server/db/client";
import { places, placeGuides, placeMedia, NewPlace } from "@/server/db/schema/places";
import { candidatePlaces, placeBlocklist, PlaceBlocklist, CandidatePlace } from "@/server/db/schema/governance";
import { assertNotBlocklisted } from "@/server/services/admin/governance.policy";
import { revalidatePlaceCatalog } from "@/server/services/cache/revalidation";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

// Curated pool of high-quality, verified Unsplash HD images for Dating Venues
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
    caption: "Góc bistro châu Âu tao nhã và riêng tư cho cặp đôi",
    credit: "Roman Bozhko / Unsplash",
  },
  {
    url: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80",
    caption: "Không gian nhà hàng thanh lịch phong cách tân cổ điển",
    credit: "Jay Wennington / Unsplash",
  },
];

const GALLERY_MEDIA_POOL = [
  {
    url: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80",
    caption: "Không gian trưng bày nghệ thuật đương đại đầy cảm hứng",
    credit: "Steve Johnson / Unsplash",
  },
  {
    url: "https://images.unsplash.com/photo-1518998053901-5348d3961a04?auto=format&fit=crop&w=1200&q=80",
    caption: "Ánh sáng spotlight tinh tế làm nổi bật tác phẩm nghệ thuật",
    credit: "Eric Park / Unsplash",
  },
];

function determineArea(candidate: CandidatePlace): string {
  const text = `${candidate.address} ${candidate.rawTags?.["addr:district"] || ""} ${candidate.rawTags?.["addr:street"] || ""}`.toLowerCase();
  if (text.includes("tây hồ") || text.includes("tay ho") || text.includes("quảng an") || text.includes("từ hoa") || text.includes("nhật chiêu") || text.includes("vệ hồ") || text.includes("yên phụ")) return "Tây Hồ";
  if (text.includes("hoàn kiếm") || text.includes("hoan kiem") || text.includes("hàng") || text.includes("nhà thờ") || text.includes("tống duy tân") || text.includes("tràng tiền") || text.includes("lý thái tổ")) return "Hoàn Kiếm";
  if (text.includes("ba đình") || text.includes("ba dinh") || text.includes("liễu giai") || text.includes("trúc bạch") || text.includes("nguyễn trường tộ") || text.includes("quán thánh") || text.includes("đội cấn") || text.includes("kim mã")) return "Ba Đình";
  if (text.includes("đống đa") || text.includes("dong da") || text.includes("chùa bộc") || text.includes("thái hà") || text.includes("ô chợ dừa") || text.includes("hoàng cầu") || text.includes("láng")) return "Đống Đa";
  if (text.includes("cầu giấy") || text.includes("cau giay") || text.includes("xuân thủy") || text.includes("duy tân") || text.includes("trung hòa")) return "Cầu Giấy";
  if (text.includes("hai bà trưng") || text.includes("hai ba trung") || text.includes("bà triệu") || text.includes("phố huế") || text.includes("lê đại hành")) return "Hai Bà Trưng";
  if (text.includes("long biên") || text.includes("long bien")) return "Long Biên";
  if (text.includes("hà đông") || text.includes("ha dong")) return "Hà Đông";

  // Coordinates fallback
  const lat = Number(candidate.lat);
  const lng = Number(candidate.lng);
  if (lat >= 21.05) return "Tây Hồ";
  if (lng >= 105.845) return "Hoàn Kiếm";
  if (lat >= 21.025) return "Ba Đình";
  return "Đống Đa";
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
  console.log("==================================================================");
  console.log("🚀 [MỞ VAN THĂNG HẠNG TỰ ĐỘNG] BULK PROMOTE HÀNG TRĂM ĐỊA ĐIỂM");
  console.log("==================================================================");

  // 1. Tải blocklist
  const blocklist: PlaceBlocklist[] = await db.select().from(placeBlocklist);
  console.log(`✓ Đã tải ${blocklist.length} quy tắc cấm (Blocklist).`);

  // 2. Lấy toàn bộ candidate places đang pending
  const candidates: CandidatePlace[] = await db
    .select()
    .from(candidatePlaces)
    .where(eq(candidatePlaces.status, "pending"));
  
  console.log(`✓ Tìm thấy ${candidates.length} ứng viên đang chờ thăng hạng.`);

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
      console.log(`⚠️ Bỏ qua địa điểm dính blocklist: ${candidate.name}`);
      continue;
    }

    const area = determineArea(candidate);
    const category: "cafe" | "food" | "photo" | "nature" =
      candidate.category === "restaurant"
        ? "food"
        : candidate.category === "gallery"
        ? "photo"
        : candidate.category === "park"
        ? "nature"
        : "cafe";

    // Chọn bộ ảnh phù hợp theo category xoay vòng
    const mediaPool =
      category === "food"
        ? RESTAURANT_MEDIA_POOL
        : category === "photo"
        ? GALLERY_MEDIA_POOL
        : CAFE_MEDIA_POOL;

    const img1 = mediaPool[(i * 2) % mediaPool.length];
    const img2 = mediaPool[(i * 2 + 1) % mediaPool.length];
    const coverUrl = img1.url;

    const baseSlug = slugify(candidate.name) || "dia-diem-hen-ho";
    const slug = `${baseSlug}-${nanoid(6)}`;
    const newPlaceId = `plc_${nanoid(16)}`;

    // Tạo thông tin giá & mô tả tùy biến
    const isFood = category === "food";
    const priceLevel = isFood ? 2 : 1;
    const estCostMin = isFood ? 80000 : 35000;
    const estCostMax = isFood ? 250000 : 75000;
    const summary = isFood
      ? `Không gian ẩm thực ấm áp tại ${area}, thực đơn phong phú thích hợp cho buổi hẹn hò lãng mạn cùng người thương.`
      : `Quán cà phê với không gian thư thái, view đẹp tại ${area}, điểm dừng chân lý tưởng để chuyện trò và lưu giữ khoảnh khắc.`;

    const moods = isFood
      ? ["lãng mạn", "ấm cúng", "ẩm thực"]
      : ["thư thái", "chụp ảnh", "tâm tình"];

    const tags = ["auto_promoted", "dating_hanoi", category, area.toLowerCase()];

    // Insert Place vào DB
    await db.insert(places).values({
      id: newPlaceId,
      slug,
      name: candidate.name,
      searchName: candidate.searchName || candidate.name.toLowerCase(),
      searchText: `${candidate.name} ${candidate.address} ${area}`,
      city: candidate.city || "hanoi",
      area,
      address: candidate.address || `Hà Nội`,
      lat: candidate.lat,
      lng: candidate.lng,
      category,
      priceLevel,
      estCostMin,
      estCostMax,
      moods,
      tags,
      indoor: true,
      coverUrl,
      summary,
      status: "published",
      publishState: "published",
      tier: "B",
      batchId: "bulk_promote_v1",
      dateFit: isFood ? "romantic" : "chill",
      createdAt: now,
      updatedAt: now,
    });

    // Insert Place Guide
    await db.insert(placeGuides).values({
      placeId: newPlaceId,
      bestTimes: [
        {
          label: isFood ? "Bữa tối lãng mạn" : "Cà phê chuyện trò",
          start: isFood ? "18:30" : "15:00",
          end: isFood ? "21:00" : "18:00",
          type: "golden",
          note: isFood ? "Ánh đèn vàng lên màu đẹp nhất" : "Khoảng thời gian ngắm phố thư thái",
        },
      ],
      bestWeekdays: [1, 2, 3, 4, 5],
      avoidWeekdays: [0, 6],
      crowdNotes: "Hợp đi: Các buổi tối ngày trong tuần. Tránh: Giờ cao điểm trưa hoặc tối thứ 7 đông đúc.",
      photoSpots: [
        {
          name: isFood ? "Góc bàn đôi bên ánh nến" : "Bàn đôi cạnh khung cửa kính nhìn ra phố",
          howToFind: "Khu vực tầng 1 hoặc tầng lửng của quán.",
          tip: "Chụp lúc hoàng hôn hoặc chập tối khi đèn vừa lên tạo hiệu ứng lung linh.",
        },
      ],
      poses: [
        {
          title: isFood ? "Cụng ly mừng ngày gặp gỡ" : "Nâng ly đồ uống tâm tình",
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
      tips: candidate.rawTags?.phone ? `Có thể gọi ${candidate.rawTags.phone} để đặt bàn trước nếu đi cuối tuần.` : "Nên kiểm tra chỗ gửi xe trước quán khi tới.",
      sourceLinks: ["https://datemate.vn"],
    });

    // Insert Media (2 ảnh HD)
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
    if (promotedCount % 20 === 0 || promotedCount === candidates.length) {
      console.log(`  [Tiến độ: ${promotedCount}/${candidates.length}] Đã thăng hạng thành công: ${candidate.name} (${area})`);
    }
  }

  // 3. Revalidate Next.js cache
  try {
    revalidatePlaceCatalog();
    console.log("\n=> Revalidate cache Next.js thành công!");
  } catch {
    // CLI context
  }

  console.log("\n==================================================================");
  console.log("🎉 [HOÀN TẤT MỞ VAN THĂNG HẠNG]");
  console.log(`   - Tổng ứng viên xử lý: ${candidates.length}`);
  console.log(`   - Thăng hạng thành công: ${promotedCount} địa điểm`);
  console.log(`   - Bỏ qua do dính blocklist: ${skippedBlocklistCount}`);
  console.log("==================================================================");
}

if (process.argv[1]?.includes("bulk-promote-all-candidates")) {
  main().catch((err) => {
    console.error("❌ Lỗi bulk promotion:", err);
    process.exit(1);
  });
}
