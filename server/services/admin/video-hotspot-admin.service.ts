import { nanoid } from "nanoid";
import type { AdminIdentity } from "@/server/auth/admin-auth";
import { assertDatabaseConfigured } from "@/server/db/client";
import {
  deleteHotspotWithAudit,
  findCatalogVideo,
  findHotspot,
  insertHotspotWithAudit,
  listHotspotsByVideo,
  listVideosForAdmin,
  updateHotspotWithAudit,
  type AdminVideoRow,
  type HotspotWithPlace,
} from "@/server/db/queries/videos/video-hotspots.queries";
import { requirePublishedPlace } from "@/server/services/user/places.service";
import { AppError, ERRORS } from "@/server/http/errors";
import type { Page } from "@/lib/catalog-filter";
import type { AdminVideoListQuery, CreateHotspotBody, ReviewHotspotBody } from "@/lib/validators/admin";

export interface AdminVideoDetailDto {
  video: {
    videoId: string;
    title: string;
    description: string | null;
    channelTitle: string;
    viewCount: number;
    publishedAt: Date | null;
  };
  hotspots: HotspotWithPlace[];
}

function isDuplicateKeyError(err: unknown): boolean {
  return err instanceof Error && /duplicate|1062/i.test(err.message);
}

export async function listAdminVideos(query: AdminVideoListQuery): Promise<Page<AdminVideoRow>> {
  assertDatabaseConfigured();
  const offset = query.cursor ? Number(query.cursor) : 0;
  const rows = await listVideosForAdmin({ q: query.q, filter: query.filter, offset, limit: query.limit });
  return {
    items: rows.slice(0, query.limit),
    nextCursor: rows.length > query.limit ? String(offset + query.limit) : null,
  };
}

export async function getAdminVideoDetail(videoId: string): Promise<AdminVideoDetailDto> {
  assertDatabaseConfigured();
  const video = await findCatalogVideo(videoId);
  if (!video) throw new AppError(ERRORS.VIDEO.NOT_FOUND);
  return {
    video: {
      videoId: video.videoId,
      title: video.title,
      description: video.description,
      channelTitle: video.channelTitle,
      viewCount: video.viewCount,
      publishedAt: video.publishedAt,
    },
    hotspots: await listHotspotsByVideo(videoId),
  };
}

/** Admin ghim tay: đã xem tận mắt nên mốc được duyệt ngay. */
export async function createAdminHotspot(admin: AdminIdentity, videoId: string, input: CreateHotspotBody): Promise<AdminVideoDetailDto> {
  assertDatabaseConfigured();
  if (!(await findCatalogVideo(videoId))) throw new AppError(ERRORS.VIDEO.NOT_FOUND);
  const place = await requirePublishedPlace(input.placeId);
  const now = new Date();
  try {
    await insertHotspotWithAudit(
      {
        id: nanoid(21),
        videoId,
        placeId: place.id,
        timestampSec: input.timestampSec,
        label: input.label || place.name,
        source: "admin",
        confidence: null,
        evidence: null,
        status: "verified",
        createdBy: admin.email,
        verifiedBy: admin.email,
        createdAt: now,
        updatedAt: now,
      },
      { adminEmail: admin.email, action: "hotspot_create", changes: { videoId, placeId: place.id, timestampSec: input.timestampSec }, at: now }
    );
  } catch (err) {
    if (isDuplicateKeyError(err)) throw new AppError(ERRORS.VIDEO.HOTSPOT_DUPLICATE);
    throw err;
  }
  return getAdminVideoDetail(videoId);
}

/** Duyệt / loại mốc (thường là mốc chapter do pipeline đề xuất), có thể chỉnh lại giây hoặc địa điểm. */
export async function reviewHotspot(
  admin: AdminIdentity,
  videoId: string,
  hotspotId: string,
  input: ReviewHotspotBody
): Promise<AdminVideoDetailDto> {
  assertDatabaseConfigured();
  const hotspot = await findHotspot(videoId, hotspotId);
  if (!hotspot) throw new AppError(ERRORS.VIDEO.HOTSPOT_NOT_FOUND);
  if (input.placeId) await requirePublishedPlace(input.placeId);

  const now = new Date();
  try {
    await updateHotspotWithAudit(
      hotspotId,
      {
        ...(input.status ? { status: input.status, verifiedBy: admin.email } : {}),
        ...(input.placeId ? { placeId: input.placeId } : {}),
        ...(input.timestampSec !== undefined ? { timestampSec: input.timestampSec } : {}),
        updatedAt: now,
      },
      {
        adminEmail: admin.email,
        action: input.status === "rejected" ? "hotspot_reject" : input.status === "verified" ? "hotspot_verify" : "hotspot_update",
        changes: { videoId, before: { status: hotspot.status, placeId: hotspot.placeId, timestampSec: hotspot.timestampSec }, after: input },
        at: now,
      }
    );
  } catch (err) {
    if (isDuplicateKeyError(err)) throw new AppError(ERRORS.VIDEO.HOTSPOT_DUPLICATE);
    throw err;
  }
  return getAdminVideoDetail(videoId);
}

export async function deleteAdminHotspot(admin: AdminIdentity, videoId: string, hotspotId: string): Promise<AdminVideoDetailDto> {
  assertDatabaseConfigured();
  const hotspot = await findHotspot(videoId, hotspotId);
  if (!hotspot) throw new AppError(ERRORS.VIDEO.HOTSPOT_NOT_FOUND);
  await deleteHotspotWithAudit(hotspotId, {
    adminEmail: admin.email,
    action: "hotspot_delete",
    changes: { videoId, placeId: hotspot.placeId, timestampSec: hotspot.timestampSec, status: hotspot.status },
    at: new Date(),
  });
  return getAdminVideoDetail(videoId);
}
