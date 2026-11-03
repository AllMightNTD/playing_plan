import { db } from "@/server/db/client";
import { places } from "@/server/db/schema/places";
import { eq, like, or } from "drizzle-orm";
import { buildGoogleMapsSearchUrl } from "@/server/services/maps/google-maps.builder";
import { enrichPlaceMapInfo, isGenericAddress } from "@/server/services/maps/geocoding.service";

// Bản đồ địa chỉ chính xác cho các địa điểm trọng điểm ban đầu
const KNOWN_EXACT_ADDRESSES: Record<string, string> = {
  p1: "Cầu Long Biên, Hoàn Kiếm, Hà Nội",
  p2: "Đinh Tiên Hoàng, Hàng Trống, Hoàn Kiếm, Hà Nội",
  p3: "Đường Thanh Niên, Yên Phụ, Tây Hồ, Hà Nội",
  p4: "Ngõ 264 Âu Cơ, Nhật Tân, Tây Hồ, Hà Nội",
  p5: "Bãi Thạch Cầu, Long Biên, Hà Nội",
  p6: "Phan Đình Phùng, Quán Thánh, Ba Đình, Hà Nội",
  p7: "Bát Tràng, Gia Lâm, Hà Nội",
  p8: "11 Hàng Khoai, Đồng Xuân, Hoàn Kiếm, Hà Nội",
  p9: "1 Hoả Lò, Trần Hưng Đạo, Hoàn Kiếm, Hà Nội",
  p10: "Tầng 65 Lotte Center, 54 Liễu Giai, Ngọc Khánh, Ba Đình, Hà Nội",
};

async function executeWithRetry<T>(fn: () => Promise<T>, maxRetries = 4, delayBase = 1500): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[Retry ${attempt}/${maxRetries}] Thử lại sau lỗi kết nối:`, msg);
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, delayBase * attempt));
      }
    }
  }
  throw lastErr;
}

export async function runEnrichGoogleMaps() {
  console.log("=== BẮT ĐẦU CHUẨN HÓA DỮ LIỆU ĐỊA ĐIỂM GOOGLE MAPS ===");

  // 1. Chỉ query các cột cần thiết để payload siêu nhẹ, tránh nghẽn socket
  const allPlaces = await executeWithRetry(async () => {
    return await db
      .select({
        id: places.id,
        name: places.name,
        address: places.address,
        area: places.area,
        lat: places.lat,
        lng: places.lng,
        category: places.category,
        googleMapsUrl: places.googleMapsUrl,
        googlePlaceId: places.googlePlaceId,
      })
      .from(places);
  });

  console.log(`[Info] Tải thành công ${allPlaces.length} địa điểm từ TiDB Serverless.`);

  let addressUpdatedCount = 0;
  let mapsUrlUpdatedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < allPlaces.length; i++) {
    const item = allPlaces[i];
    let currentAddress = item.address;
    let needsAddressUpdate = false;

    try {
      // 1. Kiểm tra địa chỉ có trong danh sách chuẩn hóa sẵn không
      if (KNOWN_EXACT_ADDRESSES[item.id]) {
        currentAddress = KNOWN_EXACT_ADDRESSES[item.id];
        needsAddressUpdate = true;
      } else if (item.name.toLowerCase().includes("sen tây hồ")) {
        currentAddress = "614 Lạc Long Quân, Nhật Tân, Tây Hồ, Hà Nội";
        needsAddressUpdate = true;
      } else if (isGenericAddress(currentAddress)) {
        // 2. Tra cứu geocoding tự động (Nominatim / Gemini)
        console.log(`[${i + 1}/${allPlaces.length}] Xử lý địa chỉ generic: "${item.name}" (${currentAddress})`);
        const enriched = await enrichPlaceMapInfo({
          id: item.id,
          name: item.name,
          address: item.address,
          area: item.area,
          lat: Number(item.lat),
          lng: Number(item.lng),
          category: item.category,
        });

        if (enriched.address && !isGenericAddress(enriched.address)) {
          currentAddress = enriched.address;
          needsAddressUpdate = true;
          console.log(`  -> Tìm thấy địa chỉ chuẩn: "${currentAddress}" [${enriched.source}]`);
        } else {
          currentAddress = `${item.area || "Hà Nội"}, Hà Nội`;
          needsAddressUpdate = true;
        }

        // Tôn trọng Fair Use Policy của Nominatim (delay 1s)
        await new Promise((r) => setTimeout(r, 1000));
      }

      // 3. Sinh Google Maps POI URL chính thức
      const googleMapsUrl = buildGoogleMapsSearchUrl({
        name: item.name,
        address: currentAddress,
        area: item.area,
        lat: Number(item.lat),
        lng: Number(item.lng),
        placeId: item.googlePlaceId,
        googleMapsUrl: item.googleMapsUrl,
      });

      const needsMapsUrlUpdate = !item.googleMapsUrl || item.googleMapsUrl !== googleMapsUrl;

      if (needsAddressUpdate || needsMapsUrlUpdate) {
        await executeWithRetry(async () => {
          await db
            .update(places)
            .set({
              address: currentAddress,
              googleMapsUrl,
              updatedAt: new Date(),
            })
            .where(eq(places.id, item.id));
        }, 3, 1000);

        if (needsAddressUpdate) addressUpdatedCount++;
        if (needsMapsUrlUpdate) mapsUrlUpdatedCount++;
      }
    } catch (placeErr: unknown) {
      const msg = placeErr instanceof Error ? placeErr.message : String(placeErr);
      console.error(`[Warn] Lỗi khi xử lý [${item.id}] ${item.name}:`, msg);
      errorCount++;
    }
  }

  console.log("=== KẾT QUẢ CHUẨN HÓA GOOGLE MAPS ===");
  console.log(`✓ Đã cập nhật địa chỉ chuẩn xác: ${addressUpdatedCount} địa điểm`);
  console.log(`✓ Đã cập nhật Google Maps POI URL: ${mapsUrlUpdatedCount} địa điểm`);
  console.log(`Số địa điểm lỗi: ${errorCount}`);

  // Kiểm tra hậu kiểm
  const remainingGeneric = await db
    .select({ id: places.id, name: places.name, address: places.address })
    .from(places)
    .where(like(places.address, "Hà Nội (%)"));

  console.log(`[Hậu kiểm] Số địa chỉ còn dạng 'Hà Nội (...)': ${remainingGeneric.length}`);
  if (remainingGeneric.length === 0) {
    console.log("✓ TUYỆT VỜI: 100% địa chỉ placeholder dạng 'Hà Nội (...)' đã được xóa sổ hoàn toàn!");
  }
}

if (require.main === module) {
  runEnrichGoogleMaps()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Lỗi khi chuẩn hóa Google Maps:", err);
      process.exit(1);
    });
}
