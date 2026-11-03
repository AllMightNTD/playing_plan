import { recheckRealPhotos } from "@/server/services/media/real-photo-recheck.service";

async function main() {
  console.log("[real-photos-recheck] Bắt đầu kiểm tra lại ảnh thật");
  const summary = await recheckRealPhotos();
  console.log(
    `[real-photos-recheck] Kiểm tra ${summary.checked} ảnh, chết ${summary.dead}, ` +
      `place bị chỉnh ${summary.placesTouched}, trả về ảnh stock ${summary.placesRestoredToStock}`,
  );
  if (summary.aborted) {
    console.warn(`[real-photos-recheck] Cầu dao bật, không xóa ảnh nào: ${summary.abortReason ?? ""}`);
    process.exit(2);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("[real-photos-recheck] Lỗi không mong đợi:", err);
  process.exit(1);
});
