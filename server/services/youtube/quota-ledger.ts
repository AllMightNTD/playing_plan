import { sql, eq } from "drizzle-orm";
import { db, DbExecutor } from "@/server/db/client";
import { youtubeQuotaLedger } from "@/server/db/schema/governance";
import { AppError, ERRORS } from "@/server/http/errors";

export const MAX_DAILY_YOUTUBE_QUOTA = 8000;

/**
 * Lấy chuỗi ngày YYYY-MM-DD theo múi giờ Pacific Time (America/Los_Angeles),
 * nơi máy chủ YouTube Data API v3 reset hạn mức hàng ngày lúc 00:00 PT.
 */
export function getPacificTimeDateString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
}

/**
 * Đảm bảo ngày quota đã tồn tại trong DB, tránh race condition khi gọi atomic update.
 */
export async function ensureQuotaRow(
  quotaDate: string,
  executor: DbExecutor = db
): Promise<void> {
  const now = new Date();
  await executor
    .insert(youtubeQuotaLedger)
    .values({
      quotaDate,
      unitsUsed: 0,
      lastCallAt: now,
      isHalted: false,
    })
    .onDuplicateKeyUpdate({
      set: { quotaDate },
    });
}

export interface QuotaReservationResult {
  success: boolean;
  quotaDate: string;
  unitsUsed: number;
  isHalted: boolean;
  reason?: string;
}

/**
 * Đặt trước hạn mức YouTube API một cách nguyên tử (Atomic Reservation).
 * Tự động khóa gọi nếu vượt ngưỡng an toàn (mặc định 8,000 units/ngày).
 */
export async function reserveQuota(
  units: number,
  options?: {
    date?: Date;
    maxQuota?: number;
    executor?: DbExecutor;
  }
): Promise<QuotaReservationResult> {
  if (units <= 0) {
    throw new Error("Units must be greater than 0");
  }

  const executor = options?.executor ?? db;
  const maxQuota = options?.maxQuota ?? MAX_DAILY_YOUTUBE_QUOTA;
  const quotaDate = getPacificTimeDateString(options?.date);

  // 1. Đảm bảo row của ngày hiện tại đã có
  await ensureQuotaRow(quotaDate, executor);

  // 2. Chạy câu lệnh UPDATE nguyên tử có điều kiện chặn đua lệnh
  // Chỉ cộng nếu is_halted = false và units_used + units <= maxQuota
  const result = await executor.execute(
    sql`
      UPDATE youtube_quota_ledger
      SET 
        units_used = units_used + ${units},
        last_call_at = NOW(),
        is_halted = CASE WHEN units_used + ${units} >= ${maxQuota} THEN true ELSE is_halted END
      WHERE 
        quota_date = ${quotaDate}
        AND is_halted = false
        AND units_used + ${units} <= ${maxQuota}
    `
  );

  // Kiểm tra số dòng bị ảnh hưởng
  // @tidbcloud/serverless hoặc mysql2 trả về rowsAffected / affectedRows
  const affected = Number(
    (result as unknown as { affectedRows?: number; rowsAffected?: number })?.affectedRows ??
    (result as unknown as { affectedRows?: number; rowsAffected?: number })?.rowsAffected ??
    0
  );

  const status = await getQuotaStatus(options?.date, executor);

  if (affected > 0) {
    return {
      success: true,
      quotaDate,
      unitsUsed: status.unitsUsed,
      isHalted: status.isHalted,
    };
  }

  // Nếu không update được, tức là đã hết quota hoặc bị halted
  return {
    success: false,
    quotaDate,
    unitsUsed: status.unitsUsed,
    isHalted: status.isHalted,
    reason: status.isHalted
      ? "YouTube API quota is halted for today"
      : `Insufficient quota. Requested ${units}, used ${status.unitsUsed}/${maxQuota}`,
  };
}

/**
 * Lấy thông tin trạng thái hạn mức của ngày chỉ định.
 */
export async function getQuotaStatus(
  date: Date = new Date(),
  executor: DbExecutor = db
): Promise<{
  quotaDate: string;
  unitsUsed: number;
  isHalted: boolean;
  remaining: number;
}> {
  const quotaDate = getPacificTimeDateString(date);
  const rows = await executor
    .select()
    .from(youtubeQuotaLedger)
    .where(eq(youtubeQuotaLedger.quotaDate, quotaDate))
    .limit(1);

  if (rows.length === 0) {
    return {
      quotaDate,
      unitsUsed: 0,
      isHalted: false,
      remaining: MAX_DAILY_YOUTUBE_QUOTA,
    };
  }

  const row = rows[0];
  return {
    quotaDate,
    unitsUsed: row.unitsUsed,
    isHalted: row.isHalted,
    remaining: Math.max(0, MAX_DAILY_YOUTUBE_QUOTA - row.unitsUsed),
  };
}
