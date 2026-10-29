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

const RECOVERY_KEY_CHARS = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function generateRecoveryKey(): string {
  const bytes = crypto.randomBytes(32);
  let str = "dm_rec_";
  for (let i = 0; i < 32; i++) {
    str += RECOVERY_KEY_CHARS[bytes[i] % RECOVERY_KEY_CHARS.length];
  }
  return str;
}

export function generateInviteCode(): string {
  const bytes = crypto.randomBytes(INVITE_CODE_LENGTH);
  return Array.from(bytes, (byte) => INVITE_CODE_ALPHABET[byte % INVITE_CODE_ALPHABET.length]).join("");
}

/**
 * Người dùng có thể gõ thường/hoa, có khoảng trắng, gạch nối, hoặc tiền tố DM-.
 * Chỉ bỏ "DM" khi dài hơn mã chuẩn, vì bảng chữ cái có D và M nên mã thật cũng có thể bắt đầu bằng "DM".
 */
export function normalizeInviteCode(code: string): string {
  const cleaned = code.replace(/[\s-]/g, "").toUpperCase();
  if (cleaned.length === INVITE_CODE_LENGTH + 2 && cleaned.startsWith("DM")) {
    return cleaned.slice(2);
  }
  return cleaned;
}

/** Hiển thị mã mời dạng phân đoạn dễ đọc DM-X7K9-P2M4 */
export function formatInviteCode(code: string): string {
  const clean = normalizeInviteCode(code);
  if (clean.length === 8) {
    return `DM-${clean.slice(0, 4)}-${clean.slice(4)}`;
  }
  return clean;
}
