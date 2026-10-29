/**
 * Phase 5 Safe Database Migration
 * Tạo các bảng place_checkins, blind_date_tickets, secret_notes trên TiDB Cloud
 * Chạy: node --env-file=.env scripts/migrations/phase5-migration.mjs
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
    if (msg.includes("already exists") || msg.includes("Duplicate key name")) {
      console.log("✓ Đã tồn tại (skip)");
    } else {
      console.error(`✗ Lỗi: ${msg}`);
      throw err;
    }
  }
}

async function main() {
  console.log("=== Bắt đầu Migration Phase 5 (Gamification: Checkin, Blind Date, Secret Notes) ===");

  // 1. Tạo bảng place_checkins
  await runStep("Tạo bảng place_checkins", async () => {
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS \`place_checkins\` (
        \`id\` VARCHAR(32) PRIMARY KEY,
        \`room_id\` VARCHAR(21) NOT NULL,
        \`member_id\` VARCHAR(21) NOT NULL,
        \`place_id\` VARCHAR(32) NOT NULL,
        \`place_name\` VARCHAR(255) NOT NULL,
        \`district\` VARCHAR(50) NOT NULL,
        \`method\` ENUM('gps_auto', 'manual_confirm') NOT NULL,
        \`checked_in_at\` DATETIME NOT NULL,
        INDEX \`idx_place_checkins_room\` (\`room_id\`, \`place_id\`),
        INDEX \`idx_place_checkins_district\` (\`room_id\`, \`district\`)
      );
    `);
  });

  // 2. Tạo bảng blind_date_tickets
  await runStep("Tạo bảng blind_date_tickets", async () => {
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS \`blind_date_tickets\` (
        \`id\` VARCHAR(32) PRIMARY KEY,
        \`room_id\` VARCHAR(21) NOT NULL,
        \`budget_tier\` ENUM('budget', 'medium', 'luxury') NOT NULL DEFAULT 'medium',
        \`current_step\` INT NOT NULL DEFAULT 1,
        \`total_steps\` INT NOT NULL DEFAULT 3,
        \`status\` ENUM('in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'in_progress',
        \`steps_data\` JSON NOT NULL,
        \`created_at\` DATETIME NOT NULL,
        \`updated_at\` DATETIME NOT NULL,
        INDEX \`idx_blind_date_room_status\` (\`room_id\`, \`status\`)
      );
    `);
  });

  // 3. Tạo bảng secret_notes
  await runStep("Tạo bảng secret_notes", async () => {
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS \`secret_notes\` (
        \`id\` VARCHAR(32) PRIMARY KEY,
        \`room_id\` VARCHAR(21) NOT NULL,
        \`author_member_id\` VARCHAR(21) NOT NULL,
        \`place_id\` VARCHAR(32) NOT NULL,
        \`place_name\` VARCHAR(255) NOT NULL,
        \`district\` VARCHAR(50) NOT NULL,
        \`hint\` VARCHAR(255) NOT NULL,
        \`content\` TEXT NOT NULL,
        \`is_unlocked\` BOOLEAN NOT NULL DEFAULT FALSE,
        \`unlocked_at\` DATETIME NULL,
        \`created_at\` DATETIME NOT NULL,
        INDEX \`idx_secret_notes_room_place\` (\`room_id\`, \`place_id\`),
        INDEX \`idx_secret_notes_room_unlocked\` (\`room_id\`, \`is_unlocked\`)
      );
    `);
  });

  console.log("=== Hoàn tất Migration Phase 5 thành công! ===");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
