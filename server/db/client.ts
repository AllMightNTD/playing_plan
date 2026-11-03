import { connect } from "@tidbcloud/serverless";
import { drizzle } from "drizzle-orm/tidb-serverless";
import * as schema from "./schema";
import { AppError, ERRORS } from "@/server/http/errors";

const connectionString = process.env.DATABASE_URL || "";

// Tạo client HTTP serverless kết nối TiDB Cloud không giữ stateful connection
const client = connect({ url: connectionString });

/**
 * Chuẩn hóa số bản ghi bị ảnh hưởng cho các thao tác UPDATE/DELETE
 * giữa driver TiDB Cloud Serverless ({ rowsAffected }) và mysql2 ([{ affectedRows }]).
 */
export function getAffectedRows(result: unknown): number {
  if (!result) return 0;
  if (typeof (result as { rowsAffected?: unknown }).rowsAffected === "number") {
    return (result as { rowsAffected: number }).rowsAffected;
  }
  if (Array.isArray(result) && typeof result[0]?.affectedRows === "number") {
    return result[0].affectedRows;
  }
  if (typeof (result as { affectedRows?: unknown }).affectedRows === "number") {
    return (result as { affectedRows: number }).affectedRows;
  }
  return 0;
}

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
