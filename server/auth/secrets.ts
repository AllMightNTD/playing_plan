import crypto from "crypto";
import { INVITE_CODE_ALPHABET, INVITE_CODE_LENGTH } from "@/lib/constants/user";

export const SESSION_TOKEN_BYTES = 32; // 256 bit (mục 0.2)
export const RECOVERY_KEY_BYTES = 20; // 160 bit (mục 4.1)
export const INVITE_TOKEN_BYTES = 16; // 128 bit (F02)

/** DB chỉ lưu băm SHA-256 của mọi bí mật (token phiên, khóa khôi phục, lời mời). */
export function hashSecret(secret: string): string {
  return crypto.createHash("sha256").update(secret).digest("hex");
}

export function generateSecret(bytes: number): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function generateInviteCode(): string {
  const bytes = crypto.randomBytes(INVITE_CODE_LENGTH);
  return Array.from(bytes, (byte) => INVITE_CODE_ALPHABET[byte % INVITE_CODE_ALPHABET.length]).join("");
}

/** Người dùng có thể gõ thường/hoa, có khoảng trắng hoặc gạch nối. */
export function normalizeInviteCode(code: string): string {
  return code.replace(/[\s-]/g, "").toUpperCase();
}
