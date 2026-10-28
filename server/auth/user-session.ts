import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { getUserRepositories } from "@/server/db/repositories";
import { hashSecret } from "@/server/auth/secrets";
import { AppError, ERRORS } from "@/server/http/errors";
import type { MemberSession } from "@/server/db/repositories/types";

const PROD_SESSION_COOKIE_NAME = "__Host-dm_s";
const DEV_SESSION_COOKIE_NAME = "dm_s";
/** Client lưu khóa này vào localStorage để Silent Recovery khi Safari ITP xóa cookie. */
export const RECOVERY_KEY_HEADER = "x-dm-recovery-key";
const SESSION_MAX_AGE_SECONDS = 180 * 24 * 60 * 60;

export interface IssuedCredentials {
  sessionToken: string;
  recoveryKey?: string;
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/** `__Host-` bắt buộc Secure nên chỉ dùng ở production (HTTPS). */
function getSessionCookieName(): string {
  return isProduction() ? PROD_SESSION_COOKIE_NAME : DEV_SESSION_COOKIE_NAME;
}

export async function findRoomSession(): Promise<MemberSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName())?.value;
  if (!token) return null;
  return getUserRepositories().rooms.findMemberBySessionHash(hashSecret(token));
}

/** Guard trung tâm: roomId/memberId luôn lấy từ cookie phiên, không bao giờ từ client. */
export async function requireRoomSession(): Promise<MemberSession> {
  const session = await findRoomSession();
  if (!session) throw new AppError(ERRORS.SESSION.UNAUTHORIZED);
  return session;
}

function setSessionCookie(res: NextResponse, value: string, maxAge: number): void {
  res.cookies.set({
    name: getSessionCookieName(),
    value,
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

/** Gắn cookie phiên mới (và khóa khôi phục nếu vừa cấp) vào response. */
export function applyIssuedCredentials<T extends NextResponse>(res: T, issued: IssuedCredentials | null): T {
  if (!issued) return res;
  setSessionCookie(res, issued.sessionToken, SESSION_MAX_AGE_SECONDS);
  if (issued.recoveryKey) res.headers.set(RECOVERY_KEY_HEADER, issued.recoveryKey);
  return res;
}

/** Gia hạn trượt 180 ngày cho cookie đang dùng. */
export async function refreshSessionCookie<T extends NextResponse>(res: T): Promise<T> {
  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName())?.value;
  if (token) setSessionCookie(res, token, SESSION_MAX_AGE_SECONDS);
  return res;
}

export function clearSessionCookie<T extends NextResponse>(res: T): T {
  setSessionCookie(res, "", 0);
  return res;
}
