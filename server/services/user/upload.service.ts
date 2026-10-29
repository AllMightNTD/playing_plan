import fs from "fs";
import path from "path";
import sharp, { type Metadata } from "sharp";
import { nanoid } from "nanoid";
import { getUserRepositories } from "@/server/db/repositories";
import { AppError, ERRORS } from "@/server/http/errors";
import type { MemberSession, UploadRecord } from "@/server/db/repositories/types";
import { clearMemoryVideoCache } from "@/server/services/ai/memory-script.service";

export interface UploadResultDto {
  id: string;
  url: string;
  fileName: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  createdAt: Date;
}

/**
 * Kiểm tra Magic Bytes để xác thực đúng định dạng ảnh nhị phân hợp lệ,
 * chống tấn công đổi đuôi file hoặc tải mã độc.
 */
export function validateImageMagicBytes(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return true;
  }

  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return true;
  }

  // WebP: RIFF (bytes 0..3) ... WEBP (bytes 8..11)
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    return true;
  }

  // GIF: GIF8
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
    return true;
  }

  return false;
}

/**
 * Xác định thư mục lưu trữ ngoài web root.
 * Ưu tiên: process.env.STORAGE_DIR -> /data/datemate_storage -> local ./storage
 */
export function getStorageRootDir(): string {
  if (process.env.STORAGE_DIR) {
    fs.mkdirSync(process.env.STORAGE_DIR, { recursive: true });
    return process.env.STORAGE_DIR;
  }

  try {
    fs.mkdirSync("/data/datemate_storage", { recursive: true });
    return "/data/datemate_storage";
  } catch {
    const fallback = path.resolve(process.cwd(), "storage");
    fs.mkdirSync(fallback, { recursive: true });
    return fallback;
  }
}

/**
 * Tải ảnh kỷ niệm lên phòng:
 * 1. Kiểm tra chấp thuận Nghị định 13/2023.
 * 2. Xác thực Magic Bytes.
 * 3. Sharp DoS Guard (giới hạn 16MP) + Re-encode WebP max 2048x2048.
 * 4. Kiểm tra atomic quota 25MB & 50 ảnh.
 * 5. Lưu ra đĩa ngoài web root.
 */
export async function uploadRoomPhoto(
  session: MemberSession,
  input: {
    fileName: string;
    buffer: Buffer;
    memoryId?: string | null;
  }
): Promise<UploadResultDto> {
  const repo = getUserRepositories();

  // 1. Kiểm tra Consent Nghị định 13/2023
  const room = await repo.rooms.getRoomOverview(session.roomId);
  if (!room || !room.consentVersion) {
    throw new AppError(ERRORS.UPLOAD.CONSENT_REQUIRED);
  }

  // 2. Kiểm tra Magic Bytes
  if (!validateImageMagicBytes(input.buffer)) {
    throw new AppError(ERRORS.UPLOAD.INVALID_IMAGE);
  }

  // 3. Sharp Guard (Chống Decompression Bomb 16MP) & Re-encode WebP
  let processedBuffer: Buffer;
  let metadata: Metadata;
  try {
    const pipeline = sharp(input.buffer, {
      limitInputPixels: 16777216, // 16MP max
    });

    metadata = await pipeline.metadata();

    processedBuffer = await pipeline
      .resize({
        width: 2048,
        height: 2048,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("limitInputPixels") || msg.includes("exceeds pixel limit") || msg.includes("Input image exceeds")) {
      throw new AppError(ERRORS.UPLOAD.IMAGE_TOO_LARGE);
    }
    throw new AppError(ERRORS.UPLOAD.INVALID_IMAGE);
  }

  const sizeBytes = processedBuffer.length;

  // 4. Atomic Quota Allocation (dung lượng <= 25MB và số lượng <= 50)
  const quotaAllocated = await repo.uploads.atomicAllocateQuota(session.roomId, sizeBytes, 1);
  if (!quotaAllocated) {
    throw new AppError(ERRORS.UPLOAD.QUOTA_EXCEEDED);
  }

  // 5. Lưu tệp ra storage ngoài web root
  const uploadId = `img_${nanoid(24)}`;
  const relativePath = path.join("rooms", session.roomId, "memories", `${uploadId}.webp`);
  const fullPath = path.join(getStorageRootDir(), "uploads", relativePath);

  try {
    await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.promises.writeFile(fullPath, processedBuffer);
  } catch (err) {
    // Compensation: Hoàn trả quota nếu ghi file lỗi
    await repo.uploads.atomicReleaseQuota(session.roomId, sizeBytes, 1);
    throw err;
  }

  // 6. Ghi bản ghi vào Database
  const now = new Date();
  const record: UploadRecord = {
    id: uploadId,
    roomId: session.roomId,
    memberId: session.memberId,
    memoryId: input.memoryId ?? null,
    fileName: input.fileName,
    mimeType: "image/webp",
    sizeBytes,
    width: metadata.width ?? null,
    height: metadata.height ?? null,
    relativePath,
    createdAt: now,
    deletedAt: null,
  };

  try {
    await repo.uploads.insertUpload(record);
  } catch (err) {
    // Cleanup đĩa & quota nếu DB fail
    try {
      await fs.promises.unlink(fullPath);
    } catch {
      // Ignored
    }
    await repo.uploads.atomicReleaseQuota(session.roomId, sizeBytes, 1);
    throw err;
  }

  // Xóa cache video để cập nhật thước phim ngay khi có ảnh mới
  clearMemoryVideoCache();

  return {
    id: uploadId,
    url: `/api/v1/user/uploads/${uploadId}`,
    fileName: input.fileName,
    sizeBytes,
    width: metadata.width ?? null,
    height: metadata.height ?? null,
    createdAt: now,
  };
}

/**
 * Đọc file nhị phân ảnh được bảo vệ bởi Room Session
 */
export async function getProtectedUpload(
  session: MemberSession,
  uploadId: string
): Promise<{ buffer: Buffer; mimeType: string; fileName: string; sizeBytes: number }> {
  const repo = getUserRepositories();
  const upload = await repo.uploads.getUpload(session.roomId, uploadId);

  if (!upload || upload.deletedAt) {
    throw new AppError(ERRORS.UPLOAD.NOT_FOUND);
  }

  const fullPath = path.join(getStorageRootDir(), "uploads", upload.relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new AppError(ERRORS.UPLOAD.NOT_FOUND);
  }

  const buffer = await fs.promises.readFile(fullPath);
  return {
    buffer,
    mimeType: upload.mimeType,
    fileName: upload.fileName,
    sizeBytes: upload.sizeBytes,
  };
}

/**
 * Xóa ảnh và hoàn trả quota dung lượng
 */
export async function deleteRoomUpload(session: MemberSession, uploadId: string): Promise<void> {
  const repo = getUserRepositories();
  const deleted = await repo.uploads.softDeleteUpload(session.roomId, uploadId, new Date());

  if (!deleted) {
    throw new AppError(ERRORS.UPLOAD.NOT_FOUND);
  }

  // Hoàn trả quota
  await repo.uploads.atomicReleaseQuota(session.roomId, deleted.sizeBytes, 1);

  // Xóa cache video
  clearMemoryVideoCache();

  // Xóa tệp trên đĩa
  const fullPath = path.join(getStorageRootDir(), "uploads", deleted.relativePath);
  try {
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
    }
  } catch {
    // Soft-delete DB đã xong, file physical dọn sau nếu lỗi
  }
}

/**
 * Danh sách ảnh đã tải lên của phòng
 */
export async function listRoomUploads(session: MemberSession): Promise<UploadResultDto[]> {
  const repo = getUserRepositories();
  const uploads = await repo.uploads.listUploads(session.roomId);
  return uploads.map((u) => ({
    id: u.id,
    url: `/api/v1/user/uploads/${u.id}`,
    fileName: u.fileName,
    sizeBytes: u.sizeBytes,
    width: u.width,
    height: u.height,
    createdAt: u.createdAt,
  }));
}

