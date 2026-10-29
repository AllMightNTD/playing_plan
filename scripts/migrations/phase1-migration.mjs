/**
 * Phase 1 Safe Database Migration
 * Tạo bảng plan_rsvps trên TiDB Cloud
 * Chạy: node --env-file=.env scripts/migrations/phase1-migration.mjs
 */
import { connect } from "@tidbcloud/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("✗ DATABASE_URL không tồn tại trong môi trường");
  process.exit(1);
}

const conn = connect({ url });

async function runStep(label, fn) {
  process.stdout.write(`→ ${label}... `);
  try {
    await fn();
    console.log("✓ OK");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("already exists")) {
      console.log("✓ Đã tồn tại (skip)");
    } else {
      console.error(`✗ Lỗi: ${msg}`);
      throw err;
    }
  }
}

async function main() {
  console.log("=== Bắt đầu Migration Phase 1 (TiDB Cloud) ===");

  // 1. Tạo bảng plan_rsvps
  await runStep("Tạo bảng plan_rsvps", async () => {
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS \`plan_rsvps\` (
        \`id\` VARCHAR(21) PRIMARY KEY,
        \`plan_id\` VARCHAR(21) NOT NULL,
        \`room_id\` VARCHAR(21) NOT NULL,
        \`responder_name\` VARCHAR(60) NOT NULL,
        \`status\` ENUM('confirmed', 'change_requested') NOT NULL,
        \`change_note\` TEXT NULL,
        \`created_at\` DATETIME NOT NULL,
        INDEX \`idx_plan_rsvps_plan\` (\`plan_id\`)
      );
    `);
  });

  console.log("=== Hoàn tất Migration Phase 1 thành công! ===");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
