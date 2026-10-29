import fs from "fs";
import path from "path";
import { getMemoryStore } from "@/server/db/demo/memory-store";
import { isDatabaseConfigured, db } from "@/server/db/client";
import { rooms } from "@/server/db/schema";
import { and, isNotNull, lte, eq } from "drizzle-orm";
import { getStorageRootDir } from "./upload.service";

export interface PurgeResultDto {
  purgedCount: number;
  purgedRoomIds: string[];
}

export const SOFT_DELETE_RETENTION_MS = 14 * 24 * 60 * 60 * 1000; // 14 ngày theo Nghị định 13/2023

/**
 * Xóa sạch thư mục lưu trữ ảnh của phòng trên đĩa
 */
export function removeRoomStorageDirectory(roomId: string): void {
  try {
    const rootDir = getStorageRootDir();
    const roomDir = path.join(rootDir, "rooms", roomId);
    if (fs.existsSync(roomDir)) {
      fs.rmSync(roomDir, { recursive: true, force: true });
    }
  } catch {
    // Không chặn luồng nếu đĩa đã được dọn
  }
}

/**
 * Quét và Hard-delete vĩnh viễn các phòng đã quá hạn 14 ngày soft-delete
 */
export async function purgeExpiredSoftDeletedRooms(now: Date = new Date()): Promise<PurgeResultDto> {
  const cutoffDate = new Date(now.getTime() - SOFT_DELETE_RETENTION_MS);
  const purgedRoomIds: string[] = [];

  if (isDatabaseConfigured()) {
    // 1. Quét từ cơ sở dữ liệu thật
    const expiredRooms = await db
      .select({ id: rooms.id })
      .from(rooms)
      .where(and(isNotNull(rooms.pendingDeletedAt), lte(rooms.pendingDeletedAt, cutoffDate)));

    for (const r of expiredRooms) {
      removeRoomStorageDirectory(r.id);
      await db.delete(rooms).where(eq(rooms.id, r.id));
      purgedRoomIds.push(r.id);
    }
  } else {
    // 2. Quét từ In-Memory Store
    const store = getMemoryStore();
    for (const [id, room] of store.rooms.entries()) {
      if (room.pendingDeletedAt && room.pendingDeletedAt.getTime() <= cutoffDate.getTime()) {
        removeRoomStorageDirectory(id);
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
