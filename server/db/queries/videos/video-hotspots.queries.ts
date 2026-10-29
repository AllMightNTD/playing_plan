import { and, asc, desc, eq, like, or, sql, type SQL } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/server/db/client";
import { auditLogs, places, videoCatalog, videoHotspots, type VideoCatalogRow, type VideoHotspotRow } from "@/server/db/schema";
import { escapeLikePattern } from "@/server/db/queries/admin/places.queries";

export type HotspotStatus = VideoHotspotRow["status"];

export interface HotspotWithPlace extends VideoHotspotRow {
  placeName: string | null;
  placeSlug: string | null;
  placeArea: string | null;
  placeStatus: string | null;
}

const hotspotWithPlaceColumns = {
  id: videoHotspots.id,
  videoId: videoHotspots.videoId,
  placeId: videoHotspots.placeId,
  timestampSec: videoHotspots.timestampSec,
  label: videoHotspots.label,
  source: videoHotspots.source,
  confidence: videoHotspots.confidence,
  evidence: videoHotspots.evidence,
  status: videoHotspots.status,
  createdBy: videoHotspots.createdBy,
  verifiedBy: videoHotspots.verifiedBy,
  createdAt: videoHotspots.createdAt,
  updatedAt: videoHotspots.updatedAt,
  placeName: places.name,
  placeSlug: places.slug,
  placeArea: places.area,
  placeStatus: places.status,
};

export async function listHotspotsByVideo(videoId: string, status?: HotspotStatus): Promise<HotspotWithPlace[]> {
  const conditions: SQL[] = [eq(videoHotspots.videoId, videoId)];
  if (status) conditions.push(eq(videoHotspots.status, status));
  return db
    .select(hotspotWithPlaceColumns)
    .from(videoHotspots)
    .leftJoin(places, eq(places.id, videoHotspots.placeId))
    .where(and(...conditions))
    .orderBy(asc(videoHotspots.timestampSec));
}

export async function findHotspot(videoId: string, hotspotId: string): Promise<VideoHotspotRow | null> {
  const [row] = await db
    .select()
    .from(videoHotspots)
    .where(and(eq(videoHotspots.videoId, videoId), eq(videoHotspots.id, hotspotId)))
    .limit(1);
  return row ?? null;
}

/** Pipeline chèn mốc chapter; trùng (video, địa điểm, giây) thì bỏ qua để không đè quyết định của admin. */
export async function insertHotspotsIgnoringDuplicates(rows: Omit<VideoHotspotRow, "id">[]): Promise<void> {
  if (rows.length === 0) return;
  await db
    .insert(videoHotspots)
    .values(rows.map((row) => ({ id: nanoid(21), ...row })))
    .onDuplicateKeyUpdate({ set: { id: sql`${videoHotspots.id}` } });
}

interface AuditEntry {
  adminEmail: string;
  action: string;
  targetId: string;
  changes: Record<string, unknown>;
  at: Date;
}

async function writeAudit(executor: Pick<typeof db, "insert">, entry: AuditEntry): Promise<void> {
  await executor.insert(auditLogs).values({
    id: nanoid(21),
    adminEmail: entry.adminEmail,
    action: entry.action,
    targetType: "video_hotspot",
    targetId: entry.targetId,
    changes: entry.changes,
    createdAt: entry.at,
  });
}

export async function insertHotspotWithAudit(row: VideoHotspotRow, audit: Omit<AuditEntry, "targetId">): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.insert(videoHotspots).values(row);
    await writeAudit(tx, { ...audit, targetId: row.id });
  });
}

export async function updateHotspotWithAudit(
  hotspotId: string,
  patch: Partial<Pick<VideoHotspotRow, "status" | "timestampSec" | "placeId" | "label" | "verifiedBy" | "updatedAt">>,
  audit: Omit<AuditEntry, "targetId">
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.update(videoHotspots).set(patch).where(eq(videoHotspots.id, hotspotId));
    await writeAudit(tx, { ...audit, targetId: hotspotId });
  });
}

export async function deleteHotspotWithAudit(hotspotId: string, audit: Omit<AuditEntry, "targetId">): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(videoHotspots).where(eq(videoHotspots.id, hotspotId));
    await writeAudit(tx, { ...audit, targetId: hotspotId });
  });
}

export type AdminVideoFilter = "all" | "pending" | "verified" | "none";

export interface AdminVideoRow {
  videoId: string;
  title: string;
  channelTitle: string;
  viewCount: number;
  publishedAt: Date | null;
  pendingCount: number;
  verifiedCount: number;
}

/** Danh sách video cho admin kèm số mốc chờ duyệt / đã duyệt, lọc và phân trang offset. */
export async function listVideosForAdmin(params: {
  q?: string;
  filter: AdminVideoFilter;
  offset: number;
  limit: number;
}): Promise<AdminVideoRow[]> {
  const pendingCount = sql<string>`SUM(CASE WHEN ${videoHotspots.status} = 'pending' THEN 1 ELSE 0 END)`;
  const verifiedCount = sql<string>`SUM(CASE WHEN ${videoHotspots.status} = 'verified' THEN 1 ELSE 0 END)`;

  const where: SQL[] = [];
  if (params.q) {
    const pattern = `%${escapeLikePattern(params.q)}%`;
    where.push(or(like(videoCatalog.title, pattern), like(videoCatalog.channelTitle, pattern), eq(videoCatalog.videoId, params.q))!);
  }
  const having =
    params.filter === "pending"
      ? sql`${pendingCount} > 0`
      : params.filter === "verified"
        ? sql`${verifiedCount} > 0`
        : params.filter === "none"
          ? sql`COUNT(${videoHotspots.id}) = 0`
          : undefined;

  const rows = await db
    .select({
      videoId: videoCatalog.videoId,
      title: videoCatalog.title,
      channelTitle: videoCatalog.channelTitle,
      viewCount: videoCatalog.viewCount,
      publishedAt: videoCatalog.publishedAt,
      pendingCount,
      verifiedCount,
    })
    .from(videoCatalog)
    .leftJoin(videoHotspots, eq(videoHotspots.videoId, videoCatalog.videoId))
    .where(where.length > 0 ? and(...where) : undefined)
    .groupBy(videoCatalog.videoId)
    .having(having)
    .orderBy(desc(pendingCount), desc(videoCatalog.viewCount))
    .offset(params.offset)
    .limit(params.limit + 1);

  return rows.map((row) => ({
    ...row,
    pendingCount: Number(row.pendingCount ?? 0),
    verifiedCount: Number(row.verifiedCount ?? 0),
  }));
}

export async function findCatalogVideo(videoId: string): Promise<VideoCatalogRow | null> {
  const [row] = await db.select().from(videoCatalog).where(eq(videoCatalog.videoId, videoId)).limit(1);
  return row ?? null;
}
