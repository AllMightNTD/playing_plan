import { db } from "@/server/db/client";
import { placeVideos, candidatePlaces, PlaceVideo } from "@/server/db/schema/governance";
import { places } from "@/server/db/schema/places";
import { sql, eq } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

async function exportGoldVideoLinks() {
  const outputDir = path.resolve(process.cwd(), "data/gold-set");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log("--- [Gold Set] Trích xuất 100 cặp liên kết Place - Video đa tầng từ place_videos ---");

  // 1. Nhóm điểm cao (>= 70): lấy 10
  const highTier: PlaceVideo[] = await db
    .select()
    .from(placeVideos)
    .where(sql`CAST(${placeVideos.confidenceScore} AS DECIMAL(5,2)) >= 70.00`)
    .limit(10);

  // 2. Nhóm điểm trung bình (60.00 - 69.99): lấy 50
  const midTier: PlaceVideo[] = await db
    .select()
    .from(placeVideos)
    .where(
      sql`CAST(${placeVideos.confidenceScore} AS DECIMAL(5,2)) >= 60.00 AND CAST(${placeVideos.confidenceScore} AS DECIMAL(5,2)) < 70.00`
    )
    .limit(50);

  // 3. Nhóm điểm biên thấp (50.00 - 59.99): lấy 40
  const lowTier: PlaceVideo[] = await db
    .select()
    .from(placeVideos)
    .where(
      sql`CAST(${placeVideos.confidenceScore} AS DECIMAL(5,2)) >= 50.00 AND CAST(${placeVideos.confidenceScore} AS DECIMAL(5,2)) < 60.00`
    )
    .limit(40);

  const allSelected = [...highTier, ...midTier, ...lowTier];
  console.log(`Đã trích xuất: ${highTier.length} cao, ${midTier.length} trung bình, ${lowTier.length} thấp. Tổng: ${allSelected.length}`);

  // Tra cứu thông tin tên địa điểm từ candidatePlaces hoặc places
  const enrichedList = [];
  for (const pv of allSelected) {
    // Tìm trong candidatePlaces
    const [cand] = await db
      .select({
        name: candidatePlaces.name,
        address: candidatePlaces.address,
        category: candidatePlaces.category,
      })
      .from(candidatePlaces)
      .where(eq(candidatePlaces.id, pv.placeId))
      .limit(1);

    let placeName = cand?.name;
    let placeAddress = cand?.address;
    let placeCategory = cand?.category;

    if (!placeName) {
      const [plc] = await db
        .select({
          name: places.name,
          address: places.address,
          category: places.category,
        })
        .from(places)
        .where(eq(places.id, pv.placeId))
        .limit(1);
      if (plc) {
        placeName = plc.name;
        placeAddress = plc.address;
        placeCategory = plc.category;
      }
    }

    enrichedList.push({
      placeId: pv.placeId,
      placeName: placeName || "Chưa rõ",
      placeAddress: placeAddress || "",
      placeCategory: placeCategory || "",
      videoId: pv.videoId,
      channelId: pv.channelId,
      channelTitle: pv.channelTitle,
      confidenceScore: Number(pv.confidenceScore),
      currentStatus: pv.status,
      // Trường cần gán nhãn Ground Truth
      is_correct_match: null as boolean | null,
    });
  }

  const outputPath = path.join(outputDir, "video-links-unlabeled.json");
  fs.writeFileSync(outputPath, JSON.stringify(enrichedList, null, 2), "utf-8");
  console.log(`✓ Ghi thành công 100 cặp liên kết vào ${outputPath}`);
}

exportGoldVideoLinks()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Lỗi trích xuất video links:", err);
    process.exit(1);
  });
