import { AppError, ERRORS } from "@/server/http/errors";

export interface RateLimitRule {
  name: string;
  limit: number;
  windowMs: number;
}

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

/** Ngưỡng theo mục 13.5 và F02/F17. */
export const RATE_LIMITS = {
  SESSION_CREATE: { name: "session_create", limit: 20, windowMs: HOUR_MS },
  INVITE_FAILURE: { name: "invite_failure", limit: 5, windowMs: 15 * MINUTE_MS },
  RECOVERY_FAILURE: { name: "recovery_failure", limit: 5, windowMs: 15 * MINUTE_MS },
  SEARCH: { name: "search", limit: 60, windowMs: MINUTE_MS },
  AI_EXTRACT: { name: "ai_extract", limit: 20, windowMs: HOUR_MS },
} as const satisfies Record<string, RateLimitRule>;

interface FixedWindow {
  count: number;
  resetAt: number;
}

const PRUNE_THRESHOLD = 10_000;

// Bản in-memory (fallback mục 2.5): mỗi instance serverless đếm riêng. Thay bằng Upstash khi có key.
const globalScope = globalThis as unknown as { __datemateRateLimits?: Map<string, FixedWindow> };

function getWindows(): Map<string, FixedWindow> {
  globalScope.__datemateRateLimits ??= new Map();
  return globalScope.__datemateRateLimits;
}

function pruneExpired(windows: Map<string, FixedWindow>, now: number): void {
  if (windows.size < PRUNE_THRESHOLD) return;
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
}

export function assertWithinRateLimit(rule: RateLimitRule, subject: string, now: number = Date.now()): void {
  const window = getWindows().get(`${rule.name}:${subject}`);
  if (window && window.resetAt > now && window.count >= rule.limit) {
    throw new AppError(ERRORS.COMMON.RATE_LIMITED);
  }
}

export function recordRateLimitHit(rule: RateLimitRule, subject: string, now: number = Date.now()): void {
  const windows = getWindows();
  pruneExpired(windows, now);

  const key = `${rule.name}:${subject}`;
  const window = windows.get(key);
  if (!window || window.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + rule.windowMs });
    return;
  }
  window.count += 1;
}

/** Đếm mọi lượt gọi (khác với kiểu chỉ đếm lượt thất bại như nhập mã mời). */
export function consumeRateLimit(rule: RateLimitRule, subject: string, now: number = Date.now()): void {
  assertWithinRateLimit(rule, subject, now);
  recordRateLimitHit(rule, subject, now);
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip") || "unknown";
}
