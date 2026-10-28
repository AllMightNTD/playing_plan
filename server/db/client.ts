import { connect } from "@tidbcloud/serverless";
import { drizzle } from "drizzle-orm/tidb-serverless";
import * as schema from "./schema";
import { AppError, ERRORS } from "@/server/http/errors";

const connectionString = process.env.DATABASE_URL || "";

if (process.env.NODE_ENV !== "production") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

// Tạo client HTTP serverless kết nối TiDB Cloud không giữ stateful connection
const client = connect({ url: connectionString });

export const db = drizzle(client, { schema });
export type Database = typeof db;
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type DbExecutor = Database | Transaction;

export function isDatabaseConfigured(): boolean {
  return connectionString.length > 0;
}

/** Guard trước mọi thao tác DB: thiếu cấu hình thì trả 503 rõ ràng thay vì lỗi driver khó hiểu. */
export function assertDatabaseConfigured(): void {
  if (!isDatabaseConfigured()) {
    throw new AppError(ERRORS.COMMON.DB_NOT_CONFIGURED);
  }
}
