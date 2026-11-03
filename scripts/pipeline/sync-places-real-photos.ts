import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { runRealPhotoSync, type RealPhotoSyncOptions } from "@/server/services/media/real-photo-sync.runner";

/** Đọc cờ dạng --limit=5, --slug=x, --force, --dry-run từ argv. */
function parseArgs(argv: string[]): RealPhotoSyncOptions {
  const opts: RealPhotoSyncOptions = {};
  for (const arg of argv) {
    if (arg === "--force") opts.force = true;
    else if (arg === "--dry-run") opts.dryRun = true;
    else if (arg.startsWith("--limit=")) {
      const n = Number(arg.slice("--limit=".length));
      if (Number.isFinite(n) && n > 0) opts.limit = Math.floor(n);
    } else if (arg.startsWith("--slug=")) opts.slug = arg.slice("--slug=".length);
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  console.log("[real-photos] Bắt đầu tìm ảnh thật qua Bing", opts);

  const summary = await runRealPhotoSync(opts);

  console.log(
    `[real-photos] Xử lý ${summary.processed} địa điểm, thay ảnh ${summary.replaced}, ` +
      `chèn ${summary.photosInserted} ảnh, cần duyệt tay ${summary.needsReview.length}${opts.dryRun ? " (dry-run)" : ""}`,
  );
  if (summary.blocked) console.warn("[real-photos] Bing chặn (captcha) — đã dừng sớm, hãy chạy lại sau.");
  if (summary.aborted) console.warn("[real-photos] Ghi DB lỗi liên tiếp — đã dừng sớm, kiểm tra kết nối DB.");

  const reportPath = resolve(process.cwd(), "scripts/output/real-photos-report.json");
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, JSON.stringify(summary, null, 2), "utf-8");
  console.log(`[real-photos] Báo cáo: ${reportPath}`);

  process.exit(summary.blocked || summary.aborted ? 2 : 0);
}

main().catch((err) => {
  console.error("[real-photos] Lỗi không mong đợi:", err);
  process.exit(1);
});
