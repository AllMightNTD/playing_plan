import { db } from "@/server/db/client";
import { candidatePlaces, CandidatePlace } from "@/server/db/schema/governance";
import { gte, lte, and } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

async function exportGoldCandidates() {
  const outputDir = path.resolve(process.cwd(), "data/gold-set");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log("--- [Gold Set] Trích xuất 100 ứng viên đa tầng từ candidate_places ---");

  // 1. Nhóm điểm cao (>= 70): lấy toàn bộ 18 có sẵn
  const highTier: CandidatePlace[] = await db
    .select()
    .from(candidatePlaces)
    .where(gte(candidatePlaces.datingScore, 70))
    .limit(30);

  // 2. Nhóm điểm trung bình (50 - 69): bù lấy 52
  const midTier: CandidatePlace[] = await db
    .select()
    .from(candidatePlaces)
    .where(
      and(
        gte(candidatePlaces.datingScore, 50),
        lte(candidatePlaces.datingScore, 69)
      )
    )
    .limit(52);

  // 3. Nhóm điểm biên (40 - 49): lấy 30
  const lowTier: CandidatePlace[] = await db
    .select()
    .from(candidatePlaces)
    .where(
      and(
        gte(candidatePlaces.datingScore, 40),
        lte(candidatePlaces.datingScore, 49)
      )
    )
    .limit(30);

  const allSelected = [...highTier, ...midTier, ...lowTier];
  console.log(`Đã trích xuất: ${highTier.length} cao, ${midTier.length} trung bình, ${lowTier.length} biên. Tổng: ${allSelected.length}`);

  const candidatesExport = allSelected.map((c) => ({
    id: c.id,
    osmId: c.osmId,
    name: c.name,
    category: c.category,
    address: c.address,
    datingScore: c.datingScore,
    rawTags: c.rawTags,
    // Các trường cần gán nhãn
    is_date_worthy: null as boolean | null,
    actual_category: null as string | null,
    actual_date_fit: null as string | null,
    expected_tier: null as "A" | "B" | "C" | null,
  }));

  const outputPath = path.join(outputDir, "candidates-unlabeled.json");
  fs.writeFileSync(outputPath, JSON.stringify(candidatesExport, null, 2), "utf-8");
  console.log(`✓ Ghi thành công vào ${outputPath}`);
}

exportGoldCandidates()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Lỗi trích xuất candidates:", err);
    process.exit(1);
  });
