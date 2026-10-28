/**
 * Kiểm tra kết nối TiDB Cloud (chỉ đọc): phiên bản, độ trễ, bảng nào đã có / còn thiếu so với schema.
 * Chạy: pnpm db:check   (đọc DATABASE_URL từ .env, không in chuỗi kết nối)
 */
import { connect } from "@tidbcloud/serverless";

const EXPECTED_TABLES = [
  "rooms",
  "room_members",
  "places",
  "place_guides",
  "place_media",
  "saved_places",
  "date_plans",
  "plan_stops",
  "checklist_items",
  "swipes",
  "matches",
  "memories",
  "memory_photos",
  "reminders",
  "audit_logs",
];

/** Chỉ in host để biết đang trỏ vào cluster nào, che user/mật khẩu. */
function describeTarget(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.pathname}`;
  } catch {
    return "(DATABASE_URL không phải URL hợp lệ)";
  }
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("✗ Chưa có DATABASE_URL trong .env");
    process.exit(1);
  }
  console.log(`→ Đang kết nối tới ${describeTarget(url)}`);

  const conn = connect({ url });
  const startedAt = Date.now();
  const [info] = await conn.execute("SELECT VERSION() AS version, DATABASE() AS db, NOW() AS server_time");
  console.log(`✓ Kết nối OK sau ${Date.now() - startedAt} ms`);
  console.log(`  version: ${info.version}`);
  console.log(`  database: ${info.db}`);

  const tables = (await conn.execute("SHOW TABLES")).map((row) => Object.values(row)[0]);
  const missing = EXPECTED_TABLES.filter((table) => !tables.includes(table));
  console.log(`  bảng hiện có (${tables.length}): ${tables.join(", ") || "(trống)"}`);
  if (missing.length > 0) {
    console.log(`  ⚠ còn thiếu ${missing.length} bảng: ${missing.join(", ")} → cần chạy pnpm db:push`);
    return;
  }

  const [counts] = await conn.execute(
    "SELECT (SELECT COUNT(*) FROM places) AS places, (SELECT COUNT(*) FROM places WHERE status = 'published') AS published, (SELECT COUNT(*) FROM rooms) AS rooms"
  );
  console.log(`  places: ${counts.places} (published ${counts.published}), rooms: ${counts.rooms}`);
}

main().catch((error) => {
  console.error(`✗ Kết nối thất bại: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
