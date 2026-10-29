import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { roomUploads, rooms } from "@/server/db/schema";
import type { UploadRecord, UploadRepository } from "@/server/db/repositories/types";

export const drizzleUploadRepository: UploadRepository = {
  async getUpload(roomId: string, uploadId: string): Promise<UploadRecord | null> {
    const [row] = await db
      .select()
      .from(roomUploads)
      .where(and(eq(roomUploads.id, uploadId), eq(roomUploads.roomId, roomId)))
      .limit(1);

    if (!row) return null;
    return {
      id: row.id,
      roomId: row.roomId,
      memberId: row.memberId,
      memoryId: row.memoryId,
      fileName: row.fileName,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      width: row.width,
      height: row.height,
      relativePath: row.relativePath,
      createdAt: row.createdAt,
      deletedAt: row.deletedAt,
    };
  },

  async insertUpload(upload: UploadRecord): Promise<void> {
    await db.insert(roomUploads).values({
      id: upload.id,
      roomId: upload.roomId,
      memberId: upload.memberId,
      memoryId: upload.memoryId,
      fileName: upload.fileName,
      mimeType: upload.mimeType,
      sizeBytes: upload.sizeBytes,
      width: upload.width,
      height: upload.height,
      relativePath: upload.relativePath,
      createdAt: upload.createdAt,
      deletedAt: upload.deletedAt,
    });
  },

  async softDeleteUpload(roomId: string, uploadId: string, now: Date): Promise<UploadRecord | null> {
    const existing = await this.getUpload(roomId, uploadId);
    if (!existing || existing.deletedAt) return null;

    await db
      .update(roomUploads)
      .set({ deletedAt: now })
      .where(and(eq(roomUploads.id, uploadId), eq(roomUploads.roomId, roomId)));

    return { ...existing, deletedAt: now };
  },

  async listUploads(roomId: string): Promise<UploadRecord[]> {
    const rows = await db
      .select()
      .from(roomUploads)
      .where(and(eq(roomUploads.roomId, roomId), isNull(roomUploads.deletedAt)))
      .orderBy(desc(roomUploads.createdAt));

    return rows.map((r) => ({
      id: r.id,
      roomId: r.roomId,
      memberId: r.memberId,
      memoryId: r.memoryId,
      fileName: r.fileName,
      mimeType: r.mimeType,
      sizeBytes: r.sizeBytes,
      width: r.width,
      height: r.height,
      relativePath: r.relativePath,
      createdAt: r.createdAt,
      deletedAt: r.deletedAt,
    }));
  },

  async atomicAllocateQuota(roomId: string, addBytes: number, addPhotos: number): Promise<boolean> {
    // Atomic SQL check: storage_used_bytes + addBytes <= storage_quota_bytes AND photo_count + addPhotos <= max_photos
    const result = await db
      .update(rooms)
      .set({
        storageUsedBytes: sql`${rooms.storageUsedBytes} + ${addBytes}`,
        photoCount: sql`${rooms.photoCount} + ${addPhotos}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(rooms.id, roomId),
          sql`${rooms.storageUsedBytes} + ${addBytes} <= ${rooms.storageQuotaBytes}`,
          sql`${rooms.photoCount} + ${addPhotos} <= ${rooms.maxPhotos}`
        )
      );

    // TiDB Serverless trả về { rowsAffected: number }, còn mysql2 trả về [{ affectedRows: number }]
    const affected =
      (result as unknown as { rowsAffected?: number; affectedRows?: number })?.rowsAffected ??
      (result as unknown as { rowsAffected?: number; affectedRows?: number })?.affectedRows ??
      (result as unknown as [{ affectedRows?: number }])?.[0]?.affectedRows ??
      0;
    return affected > 0;
  },

  async atomicReleaseQuota(roomId: string, releaseBytes: number, releasePhotos: number): Promise<void> {
    await db
      .update(rooms)
      .set({
        storageUsedBytes: sql`GREATEST(0, ${rooms.storageUsedBytes} - ${releaseBytes})`,
        photoCount: sql`GREATEST(0, ${rooms.photoCount} - ${releasePhotos})`,
        updatedAt: new Date(),
      })
      .where(eq(rooms.id, roomId));
  },
};
