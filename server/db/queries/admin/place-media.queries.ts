import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { placeMedia, places, type NewPlaceMedia, type Place } from "@/server/db/schema/places";

export interface PlaceForRealPhotos {
  id: string;
  slug: string;
  name: string;
  area: string;
  category: Place["category"];
}

/**
 * Danh sách place cần tìm ảnh thật. Mặc định bỏ qua place đã có ảnh Bing;
 * `force` bật lại để chạy lại toàn bộ, `slug` khớp chính xác.
 */
export async function listPlacesForRealPhotoSync(opts: {
  limit?: number;
  slug?: string;
  force?: boolean;
}): Promise<PlaceForRealPhotos[]> {
  const conditions = [];
  if (opts.slug) conditions.push(eq(places.slug, opts.slug));
  if (!opts.force) {
    conditions.push(
      sql`NOT EXISTS (SELECT 1 FROM ${placeMedia} WHERE ${placeMedia.placeId} = ${places.id} AND ${placeMedia.type} = 'image' AND ${placeMedia.platform} = 'bing')`,
    );
  }
  const query = db
    .select({
      id: places.id,
      slug: places.slug,
      name: places.name,
      area: places.area,
      category: places.category,
    })
    .from(places)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(places.createdAt)); // mới nhất trước để place lỗi cũ không chiếm hết quota mỗi ngày
  return opts.limit !== undefined && Number.isFinite(opts.limit) && opts.limit > 0 ? query.limit(opts.limit) : query;
}

/** Thay toàn bộ ảnh của place bằng ảnh mới trong một transaction và cập nhật ảnh bìa. */
export async function replacePlaceImages(placeId: string, rows: NewPlaceMedia[], now: Date): Promise<void> {
  if (rows.length === 0) return;
  await db.transaction(async (tx) => {
    await tx.delete(placeMedia).where(and(eq(placeMedia.placeId, placeId), eq(placeMedia.type, "image")));
    await tx.insert(placeMedia).values(rows);
    await tx.update(places).set({ coverUrl: rows[0].url, updatedAt: now }).where(eq(places.id, placeId));
  });
}

/** Place đã có ít nhất một ảnh thật (Bing) hay chưa. */
export async function placeHasRealPhotos(placeId: string): Promise<boolean> {
  const rows = await db
    .select({ id: placeMedia.id })
    .from(placeMedia)
    .where(and(eq(placeMedia.placeId, placeId), eq(placeMedia.type, "image"), eq(placeMedia.platform, "bing")))
    .limit(1);
  return rows.length > 0;
}
