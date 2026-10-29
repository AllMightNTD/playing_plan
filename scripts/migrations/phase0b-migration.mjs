/**
 * Phase 0b Safe Database Migration
 * Tạo bảng room_uploads và room_notices trên TiDB Cloud
 * Chạy: node --env-file=.env scripts/migrations/phase0b-migration.mjs
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
  console.log("=== Bắt đầu Migration Phase 0b (TiDB Cloud) ===");

  // 1. Tạo bảng room_uploads
  await runStep("Tạo bảng room_uploads", async () => {
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS \`room_uploads\` (
        \`id\` VARCHAR(32) PRIMARY KEY,
        \`room_id\` VARCHAR(21) NOT NULL,
        \`member_id\` VARCHAR(21) NOT NULL,
        \`memory_id\` VARCHAR(21) NULL,
        \`file_name\` VARCHAR(255) NOT NULL,
        \`mime_type\` VARCHAR(50) NOT NULL,
        \`size_bytes\` INT NOT NULL,
        \`width\` INT NULL,
        \`height\` INT NULL,
        \`relative_path\` VARCHAR(255) NOT NULL,
        \`created_at\` DATETIME NOT NULL,
        \`deleted_at\` DATETIME NULL,
        INDEX \`idx_room_uploads_room\` (\`room_id\`, \`deleted_at\`)
      );
    `);
  });

  // 2. Tạo bảng room_notices
  await runStep("Tạo bảng room_notices", async () => {
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS \`room_notices\` (
        \`id\` VARCHAR(21) PRIMARY KEY,
        \`room_id\` VARCHAR(21) NOT NULL,
        \`member_id\` VARCHAR(21) NULL,
        \`notice_type\` ENUM(
          'room_delete_pending',
          'new_match',
          'plan_rsvp',
          'time_change_request',
          'secret_note_unlocked'
        ) NOT NULL,
        \`title\` VARCHAR(150) NOT NULL,
        \`content\` TEXT NOT NULL,
        \`metadata\` JSON NULL,
        \`read_at\` DATETIME NULL,
        \`created_at\` DATETIME NOT NULL,
        INDEX \`idx_room_notices_room_read\` (\`room_id\`, \`read_at\`)
      );
    `);
  });

  console.log("=== Hoàn tất Migration Phase 0b thành công! ===");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
