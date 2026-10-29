import { and, desc, eq, gte, isNotNull, isNull, lt, lte, or, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { videoCatalog, type NewVideoCatalogRow, type VideoCatalogRow } from "@/server/db/schema";

const UPSERT_CHUNK = 50;

/** Upsert theo video_id: video cũ được cập nhật số liệu, không bị xóa khi lượt cào sau không thấy nó. */
export async function upsertCatalogRows(rows: NewVideoCatalogRow[]): Promise<void> {
  for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
    await db
      .insert(videoCatalog)
      .values(rows.slice(i, i + UPSERT_CHUNK))
      .onDuplicateKeyUpdate({
        set: {
          title: sql`VALUES(${videoCatalog.title})`,
          description: sql`VALUES(${videoCatalog.description})`,
          channelTitle: sql`VALUES(${videoCatalog.channelTitle})`,
          viewCount: sql`VALUES(${videoCatalog.viewCount})`,
          likeCount: sql`VALUES(${videoCatalog.likeCount})`,
          commentCount: sql`VALUES(${videoCatalog.commentCount})`,
          isEmbeddable: sql`VALUES(${videoCatalog.isEmbeddable})`,
          durationSec: sql`COALESCE(VALUES(${videoCatalog.durationSec}), ${videoCatalog.durationSec})`,
          updatedAt: sql`VALUES(${videoCatalog.updatedAt})`,
        },
      });
  }
}

export async function listCatalogRows(): Promise<VideoCatalogRow[]> {
  return db.select().from(videoCatalog).orderBy(desc(videoCatalog.viewCount));
}

/**
 * Video chưa cho AI xem (hoặc lần trước lỗi và đã quá `retryFailedBefore`), nhúng được, có độ dài
 * và không quá dài; ưu tiên video nhiều lượt xem.
 */
export async function listVideosPendingAi(
  maxDurationSec: number,
  limit: number,
  retryFailedBefore: Date
): Promise<VideoCatalogRow[]> {
  return db
    .select()
    .from(videoCatalog)
    .where(
      and(
        or(
          isNull(videoCatalog.aiAnalyzedAt),
          and(isNotNull(videoCatalog.aiAnalysisError), lt(videoCatalog.aiAnalyzedAt, retryFailedBefore))
        ),
        eq(videoCatalog.isEmbeddable, true),
        isNotNull(videoCatalog.durationSec),
        lte(videoCatalog.durationSec, maxDurationSec)
      )
    )
    .orderBy(desc(videoCatalog.viewCount))
    .limit(limit);
}

/** Tổng số giây video đã gửi cho AI kể từ `since` (tính ngân sách free tier). */
export async function sumAnalyzedDurationSince(since: Date): Promise<number> {
  const [row] = await db
    .select({ total: sql<string>`COALESCE(SUM(${videoCatalog.durationSec}), 0)` })
    .from(videoCatalog)
    .where(gte(videoCatalog.aiAnalyzedAt, since));
  return Number(row?.total ?? 0);
}

export async function markVideoAnalyzed(videoId: string, input: { model: string; error: string | null; at: Date }): Promise<void> {
  await db
    .update(videoCatalog)
    .set({ aiAnalyzedAt: input.at, aiAnalysisModel: input.model, aiAnalysisError: input.error })
    .where(eq(videoCatalog.videoId, videoId));
}
