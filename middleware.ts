import { NextRequest, NextResponse } from "next/server";

const ADMIN_COOKIES = ["__Host-dm_admin", "dm_admin"];

function getAuthSecret(): string {
  return process.env.AUTH_SECRET || "";
}

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4;
  const padded = pad ? base64 + "=".repeat(4 - pad) : base64;
  const binStr = atob(padded);
  const bytes = new Uint8Array(binStr.length);
  for (let i = 0; i < binStr.length; i++) {
    bytes[i] = binStr.charCodeAt(i);
  }
  return bytes;
}

function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function verifyTokenInEdge(token: string, secret: string): Promise<boolean> {
  if (!secret || !token || !token.includes(".")) return false;
  const [data, signature] = token.split(".");
  if (!data || !signature) return false;

  try {
    const rawPayload = JSON.parse(new TextDecoder().decode(base64UrlToUint8Array(data)));
    if (!rawPayload.email || typeof rawPayload.exp !== "number") return false;
    if (rawPayload.exp < Math.floor(Date.now() / 1000)) return false;

    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sigBuffer = await crypto.subtle.sign("HMAC", key, enc.encode(data));
    const expectedSig = bufferToBase64Url(sigBuffer);
    return expectedSig === signature;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Bỏ qua các API route (/api/* đã có requireAdmin guard)
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Tìm token trong cookies hoặc Authorization header
  let token: string | undefined;
  for (const name of ADMIN_COOKIES) {
    const val = req.cookies.get(name)?.value;
    if (val) {
      token = val;
      break;
    }
  }

  if (!token) {
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    }
  }

  const isValid = token ? await verifyTokenInEdge(token, getAuthSecret()) : false;

  // Trường hợp 1: Đang truy cập /admin/login
  if (pathname === "/admin/login") {
    if (isValid) {
      // Đã đăng nhập -> không thể vào /admin/login, chuyển hướng về callbackUrl hoặc /admin
      const callbackUrl = req.nextUrl.searchParams.get("callbackUrl") || "/admin";
      return NextResponse.redirect(new URL(callbackUrl, req.url));
    }
    return NextResponse.next();
  }

  // Trường hợp 2: Đang truy cập các route /admin, /admin/* khác
  if (!isValid) {
    // Chưa đăng nhập -> tự động chuyển hướng tới /admin/login kèm callbackUrl
    const loginUrl = new URL("/admin/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
