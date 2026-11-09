import { nanoid } from "nanoid";
import { getUserRepositories } from "@/server/db/repositories";
import { AppError, ERRORS } from "@/server/http/errors";
import type { MemberSession, UploadRecord } from "@/server/db/repositories/types";
import { clearMemoryVideoCache } from "@/server/services/ai/memory-script.service";
import {
  assertValidImageHeader,
  validateImageMagicBytes,
} from "@/lib/media/image-header";
import {
  getPhotoStorageGateway,
  type PhotoStorageGateway,
} from "@/server/storage/photo-storage.gateway";

export { validateImageMagicBytes };

export interface UploadResultDto {
  id: string;
  url: string;
  fileName: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  createdAt: Date;
}

function toUploadDto(record: UploadRecord): UploadResultDto {
  return {
    id: record.id,
    url: `/api/v1/user/uploads/${record.id}`,
    fileName: record.fileName,
    sizeBytes: record.sizeBytes,
    width: record.width,
    height: record.height,
    createdAt: record.createdAt,
  };
}

async function assertRoomUploadConsent(roomId: string): Promise<void> {
  const room = await getUserRepositories().rooms.getRoomOverview(roomId);
  if (!room || !room.consentVersion) {
    throw new AppError(ERRORS.UPLOAD.CONSENT_REQUIRED);
  }
}

async function storeAndPersistUpload(options: {
  session: MemberSession;
  fileName: string;
  memoryId: string | null;
  bytes: Uint8Array;
  mimeType: string;
  width: number;
  height: number;
  gateway: PhotoStorageGateway;
}): Promise<UploadRecord> {
  const { session, fileName, memoryId, bytes, mimeType, width, height, gateway } = options;
  const repo = getUserRepositories();
  const uploadId = `img_${nanoid(24)}`;
  const sizeBytes = bytes.byteLength;

  let storageRef: string;
  try {
    const stored = await gateway.putPhoto({
      roomId: session.roomId,
      uploadId,
      fileName,
      mimeType,
      bytes,
    });
    storageRef = stored.storageRef;
  } catch (err) {
    await repo.uploads.atomicReleaseQuota(session.roomId, sizeBytes, 1);
    throw err;
  }

  const record: UploadRecord = {
    id: uploadId,
    roomId: session.roomId,
    memberId: session.memberId,
    memoryId,
    fileName,
    mimeType,
    sizeBytes,
    width,
    height,
    relativePath: storageRef,
    createdAt: new Date(),
    deletedAt: null,
  };

  try {
    await repo.uploads.insertUpload(record);
  } catch (err) {
    await gateway.deletePhoto(storageRef).catch(() => {
      // Best-effort cleanup of orphaned remote object when DB insert fails
    });
    await repo.uploads.atomicReleaseQuota(session.roomId, sizeBytes, 1);
    throw err;
  }

  return record;
}

/**
 * Orchestrates private room photo upload onto Google Drive (or RAM fallback in dev/test):
 * 1. Enforces Decree 13/2023 room consent.
 * 2. Validates binary magic bytes & 16MP ceiling without native C++ addons.
 * 3. Reserves atomic room quota (25MB / 50 photos) with rollback compensation.
 */
export async function uploadRoomPhoto(
  session: MemberSession,
  input: {
    fileName: string;
    buffer: Uint8Array;
    memoryId?: string | null;
  },
  gateway: PhotoStorageGateway = getPhotoStorageGateway()
): Promise<UploadResultDto> {
  await assertRoomUploadConsent(session.roomId);
  const header = assertValidImageHeader(input.buffer);

  const repo = getUserRepositories();
  const allocated = await repo.uploads.atomicAllocateQuota(session.roomId, input.buffer.byteLength, 1);
  if (!allocated) {
    throw new AppError(ERRORS.UPLOAD.QUOTA_EXCEEDED);
  }

  const record = await storeAndPersistUpload({
    session,
    fileName: input.fileName,
    memoryId: input.memoryId ?? null,
    bytes: input.buffer,
    mimeType: header.mimeType,
    width: header.width,
    height: header.height,
    gateway,
  });

  clearMemoryVideoCache();
  return toUploadDto(record);
}

/** Reads room-isolated photo bytes through the configured storage gateway. */
export async function getProtectedUpload(
  session: MemberSession,
  uploadId: string,
  gateway: PhotoStorageGateway = getPhotoStorageGateway()
): Promise<{ buffer: Uint8Array; mimeType: string; fileName: string; sizeBytes: number }> {
  const upload = await getUserRepositories().uploads.getUpload(session.roomId, uploadId);
  if (!upload || upload.deletedAt) {
    throw new AppError(ERRORS.UPLOAD.NOT_FOUND);
  }

  const bytes = await gateway.getPhoto(upload.relativePath);
  if (!bytes) {
    throw new AppError(ERRORS.UPLOAD.NOT_FOUND);
  }

  return {
    buffer: bytes,
    mimeType: upload.mimeType,
    fileName: upload.fileName,
    sizeBytes: bytes.byteLength,
  };
}

/** Soft-deletes DB record, releases room quota, and deletes remote object on Google Drive. */
export async function deleteRoomUpload(
  session: MemberSession,
  uploadId: string,
  gateway: PhotoStorageGateway = getPhotoStorageGateway()
): Promise<void> {
  const repo = getUserRepositories();
  const deleted = await repo.uploads.softDeleteUpload(session.roomId, uploadId, new Date());
  if (!deleted) {
    throw new AppError(ERRORS.UPLOAD.NOT_FOUND);
  }

  await repo.uploads.atomicReleaseQuota(session.roomId, deleted.sizeBytes, 1);
  clearMemoryVideoCache();

  await gateway.deletePhoto(deleted.relativePath).catch(() => {
    // DB soft-delete and quota release succeeded; remote cleanup failure is non-blocking
  });
}

/** Lists active room uploads mapped to protected streaming URLs. */
export async function listRoomUploads(session: MemberSession): Promise<UploadResultDto[]> {
  const uploads = await getUserRepositories().uploads.listUploads(session.roomId);
  return uploads.map(toUploadDto);
}
