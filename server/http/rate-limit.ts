import { AppError, ERRORS } from "@/server/http/errors";
import { isDatabaseConfigured, db } from "@/server/db/client";
import { auditRateLimits } from "@/server/db/schema/audit";
import { eq, sql } from "drizzle-orm";

export interface RateLimitRule {
  name: string;
  limit: number;
  windowMs: number;
  blockMs?: number;
}

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** Ngưỡng Rate Limit chốt theo Master Plan mục 1.6 & 2.9 */
export const RATE_LIMITS = {
  /** Tạo phòng mới: Tối đa 5 phòng / IP / 24 giờ */
  SESSION_CREATE: { name: "session_create", limit: 5, windowMs: DAY_MS, blockMs: DAY_MS },
  /** Đoán mã mời: Tối đa 5 lần sai / 15 phút / IP. Vượt ngưỡng khóa IP 1 giờ */
  INVITE_FAILURE: { name: "invite_failure", limit: 5, windowMs: 15 * MINUTE_MS, blockMs: HOUR_MS },
  /** Khôi phục khóa: Tối đa 5 lần sai / 15 phút / IP. Vượt ngưỡng khóa IP 1 giờ */
  RECOVERY_FAILURE: { name: "recovery_failure", limit: 5, windowMs: 15 * MINUTE_MS, blockMs: HOUR_MS },
  /** Toàn cục: Tối đa 100 req/phút đoán mã mời toàn hệ thống */
  GLOBAL_INVITE_GUESS: { name: "global_invite_guess", limit: 100, windowMs: MINUTE_MS },
  SEARCH: { name: "search", limit: 60, windowMs: MINUTE_MS },
  AI_EXTRACT: { name: "ai_extract", limit: 20, windowMs: HOUR_MS },
  /** Tra vị trí theo IP: tốn quota API ngoài nên giới hạn mỗi IP */
  GEO_LOOKUP: { name: "geo_lookup", limit: 20, windowMs: MINUTE_MS },
} as const satisfies Record<string, RateLimitRule>;

interface FixedWindow {
  count: number;
  resetAt: number;
  blockedUntil?: number;
}

const PRUNE_THRESHOLD = 10_000;

const globalScope = globalThis as unknown as { __datemateRateLimits?: Map<string, FixedWindow> };

function getWindows(): Map<string, FixedWindow> {
  globalScope.__datemateRateLimits ??= new Map();
  return globalScope.__datemateRateLimits;
}

function pruneExpired(windows: Map<string, FixedWindow>, now: number): void {
  if (windows.size < PRUNE_THRESHOLD) return;
  for (const [key, window] of windows) {
    if (window.resetAt <= now && (!window.blockedUntil || window.blockedUntil <= now)) {
      windows.delete(key);
    }
  }
}

export function assertWithinRateLimit(rule: RateLimitRule, subject: string, now: number = Date.now()): void {
  const window = getWindows().get(`${rule.name}:${subject}`);
  if (window) {
    if (window.blockedUntil && window.blockedUntil > now) {
      throw new AppError(ERRORS.COMMON.RATE_LIMITED);
    }
    if (window.resetAt > now && window.count >= rule.limit) {
      throw new AppError(ERRORS.COMMON.RATE_LIMITED);
    }
  }
}

export function recordRateLimitHit(rule: RateLimitRule, subject: string, now: number = Date.now()): void {
  const windows = getWindows();
  pruneExpired(windows, now);

  const key = `${rule.name}:${subject}`;
  const window = windows.get(key);
  let count = 1;
  let blockedUntil: number | undefined;

  if (!window || window.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + rule.windowMs });
  } else {
    window.count += 1;
    count = window.count;
    if (count >= rule.limit && rule.blockMs) {
      window.blockedUntil = now + rule.blockMs;
      blockedUntil = window.blockedUntil;
    }
  }

  // Đồng bộ ngầm vào database audit_rate_limits nếu DB đang kết nối
  if (isDatabaseConfigured()) {
    const id = key.slice(0, 64);
    const nowDate = new Date(now);
    const blockedDate = blockedUntil ? new Date(blockedUntil) : null;
    db.insert(auditRateLimits)
      .values({
        id,
        attemptCount: count,
        firstAttemptAt: nowDate,
        blockedUntil: blockedDate,
        updatedAt: nowDate,
      })
      .onDuplicateKeyUpdate({
        set: {
          attemptCount: sql`${auditRateLimits.attemptCount} + 1`,
          blockedUntil: blockedDate ? sql`VALUES(blocked_until)` : sql`blocked_until`,
          updatedAt: nowDate,
        },
      })
      .catch(() => {
        // Nuốt lỗi DB audit ngầm để không làm nghẽn request chính
      });
  }
}

/** Đếm mọi lượt gọi (khác với kiểu chỉ đếm lượt thất bại như nhập mã mời). */
export function consumeRateLimit(rule: RateLimitRule, subject: string, now: number = Date.now()): void {
  assertWithinRateLimit(rule, subject, now);
  recordRateLimitHit(rule, subject, now);
}

/**
 * Trích xuất IP thực sau Reverse Proxy (Coolify, Traefik, Cloudflare, Nginx)
 * Chống giả mạo headers: ưu tiên Cloudflare, x-real-ip rồi đến IP đầu tiên trong x-forwarded-for.
 */
export function getClientIp(req: Request): string {
  const cfIp = req.headers.get("cf-connecting-ip")?.trim();
  if (cfIp && isValidIp(cfIp)) return cfIp;

  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp && isValidIp(realIp)) return realIp;

  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const firstIp = forwarded.split(",")[0]?.trim();
    if (firstIp && isValidIp(firstIp)) return firstIp;
  }

  return "127.0.0.1";
}

function isValidIp(ip: string): boolean {
  // Kiểm tra IPv4 hoặc IPv6 cơ bản
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^[a-fA-F0-9:]+$/;
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}
