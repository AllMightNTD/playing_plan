/**
 * Script cập nhật 10 địa điểm seed trong TiDB từ trạng thái 'draft' sang 'published'.
 * Chạy: node --env-file=.env scripts/publish-seed-places.mjs
 */
import { connect } from "@tidbcloud/serverless";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("LỖI: Chưa có biến DATABASE_URL trong môi trường!");
    process.exit(1);
  }

  const conn = connect({ url });
  console.log("→ Đang kết nối TiDB để cập nhật trạng thái địa điểm...");

  const targetIds = ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "p9", "p10"];
  const placeholders = targetIds.map(() => "?").join(", ");

  const updateResult = await conn.execute(
    `UPDATE places SET status = 'published', updated_at = NOW() WHERE id IN (${placeholders})`,
    targetIds
  );

  console.log("✓ Kết quả update:", updateResult);

  // Kiểm tra lại trạng thái
  const rows = await conn.execute(
    `SELECT id, name, status, cover_url FROM places WHERE id IN (${placeholders}) ORDER BY id ASC`,
    targetIds
  );

  console.log("\n--- DANH SÁCH ĐỊA ĐIỂM SAU KHI XUẤT BẢN ---");
  for (const row of rows) {
    console.log(`[${row.status.toUpperCase()}] ${row.id} - ${row.name}`);
    console.log(`  Ảnh bìa: ${row.cover_url ? row.cover_url.slice(0, 70) + "..." : "(chưa có)"}`);
  }

  const countPublished = rows.filter((r) => r.status === "published").length;
  console.log(`\n=> Tổng cộng: ${countPublished}/10 địa điểm đã chuyển sang 'published' thành công!`);
}

main().catch((err) => {
  console.error("Lỗi thực thi:", err);
  process.exit(1);
});
