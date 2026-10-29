import { getMemoryStore } from "@/server/db/demo/memory-store";
import type { UploadRecord, UploadRepository } from "@/server/db/repositories/types";

export const memoryUploadRepository: UploadRepository = {
  async getUpload(roomId: string, uploadId: string): Promise<UploadRecord | null> {
    const upload = getMemoryStore().uploads.get(uploadId);
    if (!upload || upload.roomId !== roomId) return null;
    return { ...upload };
  },

  async insertUpload(upload: UploadRecord): Promise<void> {
    getMemoryStore().uploads.set(upload.id, { ...upload });
  },

  async softDeleteUpload(roomId: string, uploadId: string, now: Date): Promise<UploadRecord | null> {
    const upload = getMemoryStore().uploads.get(uploadId);
    if (!upload || upload.roomId !== roomId || upload.deletedAt) return null;
    upload.deletedAt = now;
    return { ...upload };
  },

  async listUploads(roomId: string): Promise<UploadRecord[]> {
    return Array.from(getMemoryStore().uploads.values())
      .filter((u) => u.roomId === roomId && !u.deletedAt)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((u) => ({ ...u }));
  },

  async atomicAllocateQuota(roomId: string, addBytes: number, addPhotos: number): Promise<boolean> {
    const room = getMemoryStore().rooms.get(roomId);
    if (!room) return false;

    if (room.storageUsedBytes + addBytes > room.storageQuotaBytes) return false;
    if (room.photoCount + addPhotos > room.maxPhotos) return false;

    room.storageUsedBytes += addBytes;
    room.photoCount += addPhotos;
    room.updatedAt = new Date();
    return true;
  },

  async atomicReleaseQuota(roomId: string, releaseBytes: number, releasePhotos: number): Promise<void> {
    const room = getMemoryStore().rooms.get(roomId);
    if (!room) return;

    room.storageUsedBytes = Math.max(0, room.storageUsedBytes - releaseBytes);
    room.photoCount = Math.max(0, room.photoCount - releasePhotos);
    room.updatedAt = new Date();
  },
};
