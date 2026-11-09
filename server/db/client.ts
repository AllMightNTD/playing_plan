import { connect } from "@tidbcloud/serverless";
import { drizzle } from "drizzle-orm/tidb-serverless";
import * as schema from "./schema";
import { AppError, ERRORS } from "@/server/http/errors";

function getConnectionString(): string {
  return process.env.DATABASE_URL?.trim() ?? "";
}

function createDrizzleInstance(url: string) {
  const client = connect({ url });
  return drizzle(client, { schema });
}

export type Database = ReturnType<typeof createDrizzleInstance>;
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type DbExecutor = Database | Transaction;

let cachedUrl: string | null = null;
let cachedDb: Database | null = null;

function resolveDb(): Database {
  const url = getConnectionString();
  if (!cachedDb || cachedUrl !== url) {
    cachedUrl = url;
    cachedDb = createDrizzleInstance(url);
  }
  return cachedDb;
}

/**
 * Lazy proxy over TiDB Cloud Serverless Drizzle instance so Cloudflare Workers
 * and Next.js static builds never freeze an empty DATABASE_URL at module load time.
 */
export const db: Database = new Proxy({} as Database, {
  get(_target, prop) {
    const instance = resolveDb();
    const value = Reflect.get(instance as object, prop, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

/** Normalizes affected-row count across TiDB Serverless ({ rowsAffected }) and mysql2 ([{ affectedRows }]). */
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

export function isDatabaseConfigured(): boolean {
  return getConnectionString().length > 0;
}

/** Ensures DATABASE_URL is present at request time, throwing 503 instead of raw driver failures. */
export function assertDatabaseConfigured(): void {
  if (!isDatabaseConfigured()) {
    throw new AppError(ERRORS.COMMON.DB_NOT_CONFIGURED);
  }
}
