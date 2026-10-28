/**
 * Seed bản ghi blocklist đầu tiên cho Phố cà phê đường tàu (Train Street)
 * Chạy: node --env-file=.env scripts/seed-blocklist.mjs
 */
import { connect } from "@tidbcloud/serverless";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("✗ Thiếu DATABASE_URL trong .env");
    process.exit(1);
  }

  const conn = connect({ url });
  console.log("→ Đang kết nối TiDB để seed place_blocklist...");

  const blockRecord = {
    id: "blk_train_street",
    osm_id: null,
    name_pattern: "(đường|ray|pho|ca fe|cafe|coffee).*(tau|tàu|railway|train)",
    lat_min: "21.025000",
    lat_max: "21.035000",
    lng_min: "105.840000",
    lng_max: "105.850000",
    reason: "railway_safety",
    note: "Phố cà phê đường tàu (Hà Nội Train Street) - Khu vực hành lang an toàn đường sắt bị cấm kinh doanh.",
  };

  await conn.execute(
    `INSERT INTO place_blocklist (id, osm_id, name_pattern, lat_min, lat_max, lng_min, lng_max, reason, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE
       name_pattern = VALUES(name_pattern),
       lat_min = VALUES(lat_min),
       lat_max = VALUES(lat_max),
       lng_min = VALUES(lng_min),
       lng_max = VALUES(lng_max),
       reason = VALUES(reason),
       note = VALUES(note)`,
    [
      blockRecord.id,
      blockRecord.osm_id,
      blockRecord.name_pattern,
      blockRecord.lat_min,
      blockRecord.lat_max,
      blockRecord.lng_min,
      blockRecord.lng_max,
      blockRecord.reason,
      blockRecord.note,
    ]
  );

  console.log("✓ Đã seed thành công bản ghi Phố cà phê đường tàu vào place_blocklist");

  const rows = await conn.execute("SELECT id, reason, name_pattern, note FROM place_blocklist");
  console.log("Danh sách blocklist hiện tại:", rows);
}

main().catch((err) => {
  console.error("Lỗi:", err);
  process.exit(1);
});
