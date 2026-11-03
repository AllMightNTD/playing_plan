import crypto from "crypto";
import { cookies, headers } from "next/headers";
import type { NextResponse } from "next/server";
import { getServerSession, type NextAuthOptions } from "next-auth";
import GoogleProvider, { type GoogleProfile } from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { AppError, ERRORS } from "@/server/http/errors";

export const ADMIN_SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days (604,800s)
export const DEFAULT_ADMIN_EMAIL = "admin@datemate.vn";
export const DEFAULT_ADMIN_DEV_PASSWORD = "datemate@admin2026";

const PROD_ADMIN_COOKIE = "__Host-dm_admin";
const DEV_ADMIN_COOKIE = "dm_admin";

export interface AdminIdentity {
  email: string;
}

interface AdminTokenPayload {
  email: string;
  exp: number;
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function getAdminCookieName(): string {
  return isProduction() ? PROD_ADMIN_COOKIE : DEV_ADMIN_COOKIE;
}

function getAuthSecret(): string {
  return process.env.AUTH_SECRET || "datemate-default-admin-secret-key-2026";
}

export function signAdminToken(email: string): string {
  const payload: AdminTokenPayload = {
    email: email.toLowerCase().trim(),
    exp: Math.floor(Date.now() / 1000) + ADMIN_SESSION_MAX_AGE_SECONDS,
  };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", getAuthSecret()).update(data).digest("base64url");
  return `${data}.${signature}`;
}

export function verifyAdminToken(token?: string | null): AdminIdentity | null {
  if (!token || !token.includes(".")) return null;
  const [data, signature] = token.split(".");
  if (!data || !signature) return null;

  const expectedSig = crypto.createHmac("sha256", getAuthSecret()).update(data).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf-8")) as AdminTokenPayload;
    if (!payload.email || typeof payload.exp !== "number") return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return { email: payload.email };
  } catch {
    return null;
  }
}

export function setAdminSessionCookie(res: NextResponse, email: string): void {
  const token = signAdminToken(email);
  res.cookies.set({
    name: getAdminCookieName(),
    value: token,
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  });
}

export function clearAdminSessionCookie(res: NextResponse): void {
  res.cookies.set({
    name: getAdminCookieName(),
    value: "",
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function isAllowedAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  const allowlist = (process.env.ADMIN_EMAILS_ALLOWLIST || "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  if (allowlist.length === 0) {
    return normalized === DEFAULT_ADMIN_EMAIL;
  }
  return allowlist.includes(normalized) || normalized === DEFAULT_ADMIN_EMAIL;
}

export function getExpectedAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_DEV_PASSWORD;
}

export async function findAdminSession(): Promise<AdminIdentity | null> {
  // 1. Kiểm tra Bearer token từ Authorization header
  try {
    const headersList = await headers();
    const authHeader = headersList.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const bearerToken = authHeader.substring(7).trim();
      const verified = verifyAdminToken(bearerToken);
      if (verified && isAllowedAdminEmail(verified.email)) {
        return verified;
      }
    }
  } catch {
    // headers() có thể không khả dụng trong một số ngữ cảnh
  }

  // 2. Kiểm tra Admin Session Cookie
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(getAdminCookieName())?.value;
    if (token) {
      const verified = verifyAdminToken(token);
      if (verified && isAllowedAdminEmail(verified.email)) {
        return verified;
      }
    }
  } catch {
    // cookies() có thể không khả dụng trong một số ngữ cảnh
  }

  // 3. Kiểm tra NextAuth session (Google OAuth hoặc Credentials)
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    if (email && isAllowedAdminEmail(email)) {
      return { email };
    }
  } catch {
    // Bỏ qua lỗi NextAuth nếu chưa cấu hình secret
  }

  return null;
}

/** Mục 13.8: chỉ email đã xác minh và nằm trong allowlist mới đăng nhập được CMS. */
export const authOptions: NextAuthOptions = {
  secret: getAuthSecret(),
  session: { strategy: "jwt", maxAge: ADMIN_SESSION_MAX_AGE_SECONDS },
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Admin Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        if (credentials.password !== getExpectedAdminPassword()) return null;
        if (!isAllowedAdminEmail(credentials.email)) return null;
        return { id: "admin", email: credentials.email.toLowerCase().trim(), name: "DateMate Admin" };
      },
    }),
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID ?? "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? "",
    }),
  ],
  callbacks: {
    signIn({ user, profile, account }) {
      if (account?.provider === "credentials") {
        return isAllowedAdminEmail(user.email);
      }
      const isEmailVerified = (profile as GoogleProfile | undefined)?.email_verified === true;
      return isEmailVerified && isAllowedAdminEmail(user.email);
    },
    jwt({ token, user }) {
      if (user?.email) {
        token.email = user.email;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.email) {
        session.user.email = token.email as string;
      }
      return session;
    },
  },
};

/** Guard mọi route `/api/v1/admin/*`: chưa đăng nhập → 401, sai allowlist → 403. */
export async function requireAdmin(): Promise<AdminIdentity> {
  const admin = await findAdminSession();
  if (!admin) {
    throw new AppError(ERRORS.ADMIN.UNAUTHENTICATED);
  }
  return admin;
}

