/**
 * Apply các file migration trong ./drizzle lên TiDB Cloud qua driver HTTP (không cần mysql2/TCP).
 * Drizzle ghi lịch sử vào bảng __drizzle_migrations nên chạy lại nhiều lần vẫn an toàn.
 * Chạy: pnpm db:migrate
 */
import { connect } from "@tidbcloud/serverless";
import { drizzle } from "drizzle-orm/tidb-serverless";
import { migrate } from "drizzle-orm/tidb-serverless/migrator";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("✗ Chưa có DATABASE_URL trong .env");
  process.exit(1);
}

try {
  await migrate(drizzle(connect({ url })), { migrationsFolder: "./drizzle" });
  console.log("✓ Migration đã được apply");
} catch (error) {
  console.error(`✗ Migration thất bại: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
