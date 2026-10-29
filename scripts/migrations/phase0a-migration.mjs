/**
 * Phase 0a Safe Database Migration
 * Chạy an toàn, kiểm tra idempotent từng cột và backfill dữ liệu.
 * Chạy: node --env-file=.env scripts/migrations/phase0a-migration.mjs
 */
import { connect } from "@tidbcloud/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("✗ DATABASE_URL không tồn tại trong môi trường");
  process.exit(1);
}

const conn = connect({ url });

async function getExistingColumns(tableName) {
  try {
    const rows = await conn.execute(`DESCRIBE \`${tableName}\``);
    return rows.map((r) => r.Field);
  } catch (err) {
    return [];
  }
}

async function runStep(label, fn) {
  process.stdout.write(`→ ${label}... `);
  try {
    await fn();
    console.log("✓ OK");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Duplicate column") || msg.includes("already exists") || msg.includes("Duplicate key")) {
      console.log("✓ Đã tồn tại (skip)");
    } else {
      console.error(`✗ Lỗi: ${msg}`);
      throw err;
    }
  }
}

async function main() {
  console.log("=== Bắt đầu Migration Phase 0a (TiDB Cloud) ===");

  // 1. rooms
  const roomCols = await getExistingColumns("rooms");
  if (!roomCols.includes("room_type")) {
    await runStep("Thêm cột rooms.room_type, max_members, quotas, version, consent, pending_deleted_at", async () => {
      await conn.execute(`
        ALTER TABLE \`rooms\`
          ADD COLUMN \`room_type\` ENUM('couple', 'group') NOT NULL DEFAULT 'couple',
          ADD COLUMN \`max_members\` TINYINT NOT NULL DEFAULT 2,
          ADD COLUMN \`storage_quota_bytes\` INT NOT NULL DEFAULT 26214400,
          ADD COLUMN \`storage_used_bytes\` INT NOT NULL DEFAULT 0,
          ADD COLUMN \`photo_count\` INT NOT NULL DEFAULT 0,
          ADD COLUMN \`max_photos\` INT NOT NULL DEFAULT 50,
          ADD COLUMN \`version\` INT NOT NULL DEFAULT 1,
          ADD COLUMN \`consent_version\` VARCHAR(20) NULL,
          ADD COLUMN \`consent_at\` DATETIME NULL,
          ADD COLUMN \`pending_deleted_at\` DATETIME NULL;
      `);
    });
  } else {
    console.log("✓ rooms: Các cột mới đã tồn tại");
  }

  // 2. date_plans
  const planCols = await getExistingColumns("date_plans");
  if (!planCols.includes("version")) {
    await runStep("Thêm cột date_plans.share_token, share_expires_at, version", async () => {
      await conn.execute(`
        ALTER TABLE \`date_plans\`
          ADD COLUMN \`share_token\` VARCHAR(64) NULL,
          ADD COLUMN \`share_expires_at\` DATETIME NULL,
          ADD COLUMN \`version\` INT NOT NULL DEFAULT 1;
      `);
      try {
        await conn.execute(`CREATE UNIQUE INDEX \`uq_date_plans_share_token\` ON \`date_plans\` (\`share_token\`);`);
      } catch (e) {}
    });
  } else {
    console.log("✓ date_plans: Các cột mới đã tồn tại");
  }

  // 3. plan_stops (Safe backfill)
  const stopCols = await getExistingColumns("plan_stops");
  if (!stopCols.includes("room_id")) {
    await runStep("Thêm cột plan_stops.room_id (NULL tạm thời)", async () => {
      await conn.execute(`ALTER TABLE \`plan_stops\` ADD COLUMN \`room_id\` VARCHAR(21) NULL;`);
    });
    await runStep("Backfill plan_stops.room_id từ date_plans", async () => {
      await conn.execute(`
        UPDATE \`plan_stops\` ps 
        JOIN \`date_plans\` dp ON ps.plan_id = dp.id 
        SET ps.room_id = dp.room_id 
        WHERE ps.room_id IS NULL;
      `);
    });
    await runStep("Đặt ràng buộc NOT NULL và INDEX cho plan_stops.room_id", async () => {
      await conn.execute(`ALTER TABLE \`plan_stops\` MODIFY COLUMN \`room_id\` VARCHAR(21) NOT NULL;`);
      try {
        await conn.execute(`CREATE INDEX \`idx_plan_stops_room_id\` ON \`plan_stops\` (\`room_id\`);`);
      } catch (e) {
        // Index might already exist
      }
    });
  } else {
    console.log("✓ plan_stops: Cột room_id đã tồn tại");
  }

  if (!stopCols.includes("start_minute")) {
    await runStep("Thêm cột day_offset, start_minute, travel_minutes, is_pinned_time cho plan_stops", async () => {
      await conn.execute(`
        ALTER TABLE \`plan_stops\`
          ADD COLUMN \`day_offset\` TINYINT NOT NULL DEFAULT 0,
          ADD COLUMN \`start_minute\` INT NOT NULL DEFAULT 0,
          ADD COLUMN \`travel_minutes\` INT NOT NULL DEFAULT 15,
          ADD COLUMN \`is_pinned_time\` BOOLEAN NOT NULL DEFAULT FALSE;
      `);
    });
  } else {
    console.log("✓ plan_stops: Các cột thời gian chi tiết đã tồn tại");
  }

  // 4. memory_photos (Safe backfill)
  const photoCols = await getExistingColumns("memory_photos");
  if (!photoCols.includes("room_id")) {
    await runStep("Thêm cột memory_photos.room_id (NULL tạm thời)", async () => {
      await conn.execute(`ALTER TABLE \`memory_photos\` ADD COLUMN \`room_id\` VARCHAR(21) NULL;`);
    });
    await runStep("Backfill memory_photos.room_id từ memories", async () => {
      await conn.execute(`
        UPDATE \`memory_photos\` mp 
        JOIN \`memories\` m ON mp.memory_id = m.id 
        SET mp.room_id = m.room_id 
        WHERE mp.room_id IS NULL;
      `);
    });
    await runStep("Đặt ràng buộc NOT NULL và INDEX cho memory_photos.room_id", async () => {
      await conn.execute(`ALTER TABLE \`memory_photos\` MODIFY COLUMN \`room_id\` VARCHAR(21) NOT NULL;`);
      try {
        await conn.execute(`CREATE INDEX \`idx_memory_photos_room_id\` ON \`memory_photos\` (\`room_id\`);`);
      } catch (e) {}
    });
  } else {
    console.log("✓ memory_photos: Cột room_id đã tồn tại");
  }

  if (!photoCols.includes("upload_id")) {
    await runStep("Thêm cột memory_photos.upload_id", async () => {
      await conn.execute(`ALTER TABLE \`memory_photos\` ADD COLUMN \`upload_id\` VARCHAR(32) NULL;`);
    });
  } else {
    console.log("✓ memory_photos: Cột upload_id đã tồn tại");
  }

  // 5. matches
  const matchCols = await getExistingColumns("matches");
  if (!matchCols.includes("is_seen")) {
    await runStep("Thêm cột matches.is_seen", async () => {
      await conn.execute(`ALTER TABLE \`matches\` ADD COLUMN \`is_seen\` BOOLEAN NOT NULL DEFAULT FALSE;`);
    });
  } else {
    console.log("✓ matches: Cột is_seen đã tồn tại");
  }

  // 6. memories
  const memoryCols = await getExistingColumns("memories");
  if (!memoryCols.includes("timeline_config")) {
    await runStep("Thêm cột memories.dominant_color, timeline_config, music_track_id", async () => {
      await conn.execute(`
        ALTER TABLE \`memories\`
          ADD COLUMN \`dominant_color\` VARCHAR(7) NULL,
          ADD COLUMN \`timeline_config\` JSON NULL,
          ADD COLUMN \`music_track_id\` VARCHAR(50) NULL;
      `);
    });
  } else {
    console.log("✓ memories: Các cột mới đã tồn tại");
  }

  // 7. audit_rate_limits
  await runStep("Tạo bảng audit_rate_limits", async () => {
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS \`audit_rate_limits\` (
        \`id\` VARCHAR(64) NOT NULL,
        \`attempt_count\` INT NOT NULL DEFAULT 1,
        \`first_attempt_at\` DATETIME NOT NULL,
        \`blocked_until\` DATETIME NULL,
        \`updated_at\` DATETIME NOT NULL,
        PRIMARY KEY (\`id\`)
      );
    `);
  });

  console.log("=== Hoàn tất Migration Phase 0a thành công ===");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
