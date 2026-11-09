import { getMemoryStore } from "@/server/db/demo/memory-store";
import { isDatabaseConfigured, db } from "@/server/db/client";
import { rooms } from "@/server/db/schema";
import { and, isNotNull, lte, eq } from "drizzle-orm";
import { SOFT_DELETE_RETENTION_MS } from "@/lib/constants/user";
import {
  getPhotoStorageGateway,
  type PhotoStorageGateway,
} from "@/server/storage/photo-storage.gateway";

export { SOFT_DELETE_RETENTION_MS };

export interface PurgeResultDto {
  purgedCount: number;
  purgedRoomIds: string[];
}

/** Purges all remote/in-memory photos belonging to an expired room without local filesystem access. */
export async function removeRoomStorageObjects(
  roomId: string,
  gateway: PhotoStorageGateway = getPhotoStorageGateway()
): Promise<void> {
  await gateway.deleteRoomPhotos(roomId).catch(() => {
    // Non-blocking best-effort storage cleanup so DB purge proceeds reliably
  });
}

/** Hard-deletes rooms past the 14-day Decree 13 soft-delete retention window and purges remote photos. */
export async function purgeExpiredSoftDeletedRooms(
  now: Date = new Date(),
  gateway: PhotoStorageGateway = getPhotoStorageGateway()
): Promise<PurgeResultDto> {
  const cutoffDate = new Date(now.getTime() - SOFT_DELETE_RETENTION_MS);
  const purgedRoomIds: string[] = [];

  if (isDatabaseConfigured()) {
    const expiredRooms = await db
      .select({ id: rooms.id })
      .from(rooms)
      .where(and(isNotNull(rooms.pendingDeletedAt), lte(rooms.pendingDeletedAt, cutoffDate)));

    for (const r of expiredRooms) {
      await removeRoomStorageObjects(r.id, gateway);
      await db.delete(rooms).where(eq(rooms.id, r.id));
      purgedRoomIds.push(r.id);
    }
  } else {
    const store = getMemoryStore();
    for (const [id, room] of store.rooms.entries()) {
      if (room.pendingDeletedAt && room.pendingDeletedAt.getTime() <= cutoffDate.getTime()) {
        await removeRoomStorageObjects(id, gateway);
        store.rooms.delete(id);
        purgedRoomIds.push(id);
      }
    }
  }

  return {
    purgedCount: purgedRoomIds.length,
    purgedRoomIds,
  };
}
