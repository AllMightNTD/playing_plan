import { ZipArchive } from "archiver";
import { getUserRepositories } from "@/server/db/repositories";
import { AppError, ERRORS } from "@/server/http/errors";
import {
  getPhotoStorageGateway,
  type PhotoStorageGateway,
} from "@/server/storage/photo-storage.gateway";
import type { MemberSession } from "@/server/db/repositories/types";

function extensionFromMime(mimeType: string): string {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/gif") return "gif";
  return "webp";
}

/**
 * Exports full room data as a streaming .zip archive (Right to Data Portability / Decree 13)
 * fetching photo binaries from PhotoStorageGateway without local disk dependencies.
 */
export async function createRoomArchiveStream(
  session: MemberSession,
  gateway: PhotoStorageGateway = getPhotoStorageGateway()
): Promise<{
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

  for (const upload of uploads) {
    const bytes = await gateway.getPhoto(upload.relativePath).catch(() => null);
    if (bytes) {
      const ext = extensionFromMime(upload.mimeType);
      archive.append(Buffer.from(bytes), { name: `photos/${upload.id}.${ext}` });
    }
  }

  const fileName = `datemate-room-${session.roomId}-archive.zip`;
  return { archive, fileName };
}
