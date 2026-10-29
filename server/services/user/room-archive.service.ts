import fs from "fs";
import path from "path";
import { ZipArchive } from "archiver";
import { getUserRepositories } from "@/server/db/repositories";
import { AppError, ERRORS } from "@/server/http/errors";
import { getStorageRootDir } from "@/server/services/user/upload.service";
import type { MemberSession } from "@/server/db/repositories/types";

/**
 * Xuất toàn bộ dữ liệu phòng thành tệp .zip (Right to Data Portability / Nghị định 13)
 * Bao gồm:
 * - room_info.json: Thông tin phòng & thành viên
 * - plans.json: Lịch trình hẹn hò
 * - memories.json: Kỷ niệm & giấy nhớ
 * - photos/: Các tệp ảnh gốc/re-encoded đã tải lên
 */
export async function createRoomArchiveStream(session: MemberSession): Promise<{
  archive: ZipArchive;
  fileName: string;
}> {
  const repo = getUserRepositories();
  const room = await repo.rooms.getRoomOverview(session.roomId);
  if (!room) {
    throw new AppError(ERRORS.SESSION.UNAUTHORIZED);
  }

  const [plans, memories, notes, uploads] = await Promise.all([
    repo.plans.listByRoom(session.roomId, 100),
    repo.memories.listMemories(session.roomId, 100),
    repo.memories.listNotes(session.roomId, 100),
    repo.uploads.listUploads(session.roomId),
  ]);

  const archive = new ZipArchive({
    zlib: { level: 6 },
  });

  const roomExport = {
    exportedAt: new Date().toISOString(),
    roomId: room.id,
    roomName: room.name,
    roomType: room.roomType,
    anniversaryDate: room.anniversaryDate,
    memberCount: room.memberCount,
    members: room.members.map((m) => ({
      nickname: m.nickname,
      role: m.role,
      joinedAt: m.createdAt,
    })),
    quota: {
      storageUsedBytes: room.storageUsedBytes,
      storageQuotaBytes: room.storageQuotaBytes,
      photoCount: room.photoCount,
      maxPhotos: room.maxPhotos,
    },
  };

  archive.append(JSON.stringify(roomExport, null, 2), { name: "room_info.json" });
  archive.append(JSON.stringify(plans, null, 2), { name: "plans.json" });
  archive.append(JSON.stringify({ memories, notes }, null, 2), { name: "memories.json" });

  const storageRoot = getStorageRootDir();

  // Đính kèm các ảnh thật vào thư mục photos/
  for (const upload of uploads) {
    const fullPath = path.join(storageRoot, "uploads", upload.relativePath);
    if (fs.existsSync(fullPath)) {
      archive.file(fullPath, { name: path.join("photos", `${upload.id}.webp`) });
    }
  }

  const fileName = `datemate-room-${session.roomId}-archive.zip`;
  return { archive, fileName };
}
