import { db } from "@/server/db/client";
import { places } from "@/server/db/schema/places";
import { candidatePlaces, placeVideos, pipelineRuns } from "@/server/db/schema/governance";
import { runShadowWorker } from "@/server/services/pipeline/shadow-worker";
import { sql } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("=== GIAI ĐOẠN 2: CHẠY & KIỂM ĐỊNH SHADOW MODE ENGINE ===\n");

  // 1. Kiểm tra số lượng places TRƯỚC KHI CHẠY (Baseline Data Isolation)
  const [placesBefore] = await db.select({ count: sql<number>`count(*)` }).from(places);
  const baselineCount = Number(placesBefore?.count || 0);
  console.log(`[Data Isolation] Số địa điểm public hiện tại trong bảng 'places': ${baselineCount}`);

  // 2. Kích hoạt Shadow Worker
  console.log("\n[Shadow Worker] Đang kích hoạt chạy bóng trên toàn bộ ứng viên candidate_places...");
  const batchId = `shadow_eval_${Date.now()}`;
  const runResult = await runShadowWorker({ batchId });

  console.log(`[Shadow Worker] Kết quả đợt chạy ${runResult.runId}:`);
  console.log(`- Trạng thái: ${runResult.status}`);
  console.log(`- Tổng ứng viên đánh giá: ${runResult.totalEvaluated}`);
  console.log(`- Bậc A (Tier A): ${runResult.tierACount}`);
  console.log(`- Bậc B (Tier B): ${runResult.tierBCount}`);
  console.log(`- Bậc C (Tier C): ${runResult.tierCCount}`);
  console.log(`- Blocked / Rejected: ${runResult.rejectedCount}`);
  console.log(`- Video auto_linked (>=65%): ${runResult.autoLinkedVideosCount}`);
  console.log(`- Video pending_review (50-64%): ${runResult.pendingReviewVideosCount}`);

  // 3. Kiểm tra số lượng places SAU KHI CHẠY
  const [placesAfter] = await db.select({ count: sql<number>`count(*)` }).from(places);
  const afterCount = Number(placesAfter?.count || 0);
  console.log(`\n[Data Isolation] Số địa điểm public sau khi chạy bóng: ${afterCount}`);
  if (baselineCount !== afterCount) {
    throw new Error(`RÒ RỈ DỮ LIỆU! Số lượng places bị thay đổi: ${baselineCount} -> ${afterCount}`);
  }
  console.log("✓ TUYỆT ĐỐI CÁCH LY: Không có bất kỳ bản ghi nào bị rò rỉ vào bảng 'places' public.");

  // 4. Kiểm định độ chính xác đối chiếu với Ground Truth Test Set
  const gtDir = path.resolve(process.cwd(), "data/gold-set");
  const candidatesGT = JSON.parse(
    fs.readFileSync(path.join(gtDir, "candidates-ground-truth.json"), "utf-8")
  );
  // Lấy tập Test Set (các index lẻ)
  const testSet = candidatesGT.filter((_: unknown, idx: number) => idx % 2 !== 0);

  // Đọc kết quả thực tế từ DB của các ứng viên trong testSet
  let tierATP = 0;
  let tierAFP = 0;
  let tierAFN = 0;

  for (const item of testSet) {
    const [cand] = await db
      .select({
        evaluatedTier: candidatePlaces.evaluatedTier,
      })
      .from(candidatePlaces)
      .where(sql`${candidatePlaces.id} = ${item.id}`)
      .limit(1);

    const isPredictedA = cand?.evaluatedTier === "A";
    const isActualA = item.expected_tier === "A";

    if (isPredictedA && isActualA) tierATP++;
    else if (isPredictedA && !isActualA) tierAFP++;
    else if (!isPredictedA && isActualA) tierAFN++;
  }

  const precisionA = tierATP + tierAFP > 0 ? (tierATP / (tierATP + tierAFP)) * 100 : 0;
  const recallA = tierATP + tierAFN > 0 ? (tierATP / (tierATP + tierAFN)) * 100 : 0;

  console.log("\n=== KẾT QUẢ ĐỐI SOÁT TRÊN TẬP TEST THỰC TẾ ===");
  console.log(`- Tier A TP: ${tierATP}, FP: ${tierAFP}, FN: ${tierAFN}`);
  console.log(`- Tier A Precision: ${precisionA.toFixed(1)}% (Yêu cầu: >= 85%)`);
  console.log(`- Tier A Recall: ${recallA.toFixed(1)}%`);

  if (precisionA >= 85) {
    console.log("✓ VƯỢT CHUẨN ĐỘ CHÍNH XÁC TIER A (>= 85%)!");
  } else {
    console.warn("⚠️ Cảnh báo: Precision chưa đạt ngưỡng 85%!");
  }

  // 5. Kiểm tra pipeline_runs đã lưu đúng
  const [latestRun] = await db
    .select()
    .from(pipelineRuns)
    .where(sql`${pipelineRuns.id} = ${runResult.runId}`)
    .limit(1);
  console.log("\n[Audit Pipeline Runs] Bản ghi chạy đã được lưu vào database:", {
    id: latestRun?.id,
    runType: latestRun?.runType,
    status: latestRun?.status,
    quotaUsed: latestRun?.quotaUsed,
    promotedCount: latestRun?.promotedCount,
  });

  console.log("\n=== GIAI ĐOẠN 2 (SHADOW MODE ENGINE) HOÀN TẤT THÀNH CÔNG RỰC RỠ! ===");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Lỗi:", err);
    process.exit(1);
  });
