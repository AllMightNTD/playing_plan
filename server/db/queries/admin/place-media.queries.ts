import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getCuratedUnsplashGalleryForPlace } from "@/lib/media/unsplash-gallery-pool";
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

/** Toàn bộ ảnh thật (Bing) kèm danh mục của place, để recheck link còn sống hay không. */
export async function listRealPhotoMedia(): Promise<
  Array<{ id: string; placeId: string; url: string; sortOrder: number; category: Place["category"] }>
> {
  return db
    .select({
      id: placeMedia.id,
      placeId: placeMedia.placeId,
      url: placeMedia.url,
      sortOrder: placeMedia.sortOrder,
      category: places.category,
    })
    .from(placeMedia)
    .innerJoin(places, eq(places.id, placeMedia.placeId))
    .where(and(eq(placeMedia.type, "image"), eq(placeMedia.platform, "bing")));
}

/** Xóa ảnh chết của place và đặt lại ảnh bìa trong một transaction. */
export async function removeRealPhotos(
  placeId: string,
  mediaIds: string[],
  newCoverUrl: string,
  now: Date,
): Promise<void> {
  if (mediaIds.length === 0) return;
  await db.transaction(async (tx) => {
    await tx.delete(placeMedia).where(and(eq(placeMedia.placeId, placeId), inArray(placeMedia.id, mediaIds)));
    await tx.update(places).set({ coverUrl: newCoverUrl, updatedAt: now }).where(eq(places.id, placeId));
  });
}

/** Place mất hết ảnh thật: xóa ảnh chết rồi chèn lại bộ 4 ảnh Unsplash để không có ảnh bìa chết. */
export async function restoreStockGallery(
  placeId: string,
  category: Place["category"],
  deadIds: string[],
  now: Date,
): Promise<void> {
  const gallery = getCuratedUnsplashGalleryForPlace(category, placeId, 4);
  if (gallery.length === 0) return;
  await db.transaction(async (tx) => {
    const [place] = await tx.select({ name: places.name }).from(places).where(eq(places.id, placeId)).limit(1);
    if (!place) return;
    if (deadIds.length > 0) {
      await tx.delete(placeMedia).where(and(eq(placeMedia.placeId, placeId), inArray(placeMedia.id, deadIds)));
    }
    await tx.insert(placeMedia).values(
      gallery.map((photo, sortOrder) => ({
        id: `med_${nanoid(16)}`,
        placeId,
        type: "image" as const,
        url: photo.url,
        platform: "unsplash" as const,
        embedId: null,
        caption: `${place.name} - ${photo.caption}`.slice(0, 200),
        credit: photo.credit,
        sourceUrl: photo.url,
        licenseNote: "Unsplash Free License",
        license: "licensed" as const,
        sortOrder,
      })),
    );
    await tx.update(places).set({ coverUrl: gallery[0].url, updatedAt: now }).where(eq(places.id, placeId));
  });
}
