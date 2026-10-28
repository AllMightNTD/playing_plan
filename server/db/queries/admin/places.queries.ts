import { and, desc, eq, like, type SQL } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, type DbExecutor } from "@/server/db/client";
import {
  auditLogs,
  placeGuides,
  places,
  type AuditLog,
  type NewPlace,
  type NewPlaceGuide,
  type Place,
  type PlaceGuide,
} from "@/server/db/schema";
import type { PlaceStatus } from "@/lib/validators/admin";

export interface AuditEntry {
  adminEmail: string;
  action: "create" | "update" | "publish" | "hide";
  targetId: string;
  changes: Record<string, unknown>;
  at: Date;
}

export interface AdminPlaceListFilter {
  status?: PlaceStatus;
  searchName?: string;
  offset: number;
  limit: number;
}

export type AdminPlaceRow = Pick<Place, "id" | "slug" | "name" | "area" | "category" | "status" | "updatedAt">;
export type PlaceGuideFields = Omit<NewPlaceGuide, "placeId">;

/** Thoát ký tự đại diện của LIKE để chuỗi người dùng gõ luôn được so khớp nguyên văn. */
function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

async function insertAudit(executor: DbExecutor, entry: AuditEntry): Promise<void> {
  await executor.insert(auditLogs).values({
    id: nanoid(21),
    adminEmail: entry.adminEmail,
    action: entry.action,
    targetType: "place",
    targetId: entry.targetId,
    changes: entry.changes,
    createdAt: entry.at,
  });
}

async function upsertGuide(executor: DbExecutor, placeId: string, guide: PlaceGuideFields): Promise<void> {
  await executor
    .insert(placeGuides)
    .values({ ...guide, placeId })
    .onDuplicateKeyUpdate({ set: guide });
}

/** Lấy dư 1 dòng để biết còn trang sau hay không. */
export async function listAdminPlaces(filter: AdminPlaceListFilter): Promise<AdminPlaceRow[]> {
  const conditions: SQL[] = [];
  if (filter.status) conditions.push(eq(places.status, filter.status));
  if (filter.searchName) conditions.push(like(places.searchName, `%${escapeLikePattern(filter.searchName)}%`));

  return db
    .select({
      id: places.id,
      slug: places.slug,
      name: places.name,
      area: places.area,
      category: places.category,
      status: places.status,
      updatedAt: places.updatedAt,
    })
    .from(places)
    .where(and(...conditions))
    .orderBy(desc(places.updatedAt), desc(places.id))
    .limit(filter.limit + 1)
    .offset(filter.offset);
}

export async function findAdminPlace(placeId: string): Promise<{ place: Place; guide: PlaceGuide | null } | null> {
  const [row] = await db
    .select({ place: places, guide: placeGuides })
    .from(places)
    .leftJoin(placeGuides, eq(placeGuides.placeId, places.id))
    .where(eq(places.id, placeId))
    .limit(1);
  return row ?? null;
}

export async function findPlaceIdBySlug(slug: string): Promise<string | null> {
  const [row] = await db.select({ id: places.id }).from(places).where(eq(places.slug, slug)).limit(1);
  return row?.id ?? null;
}

export async function insertPlaceWithGuide(place: NewPlace, guide: PlaceGuideFields, audit: AuditEntry): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.insert(places).values(place);
    await upsertGuide(tx, place.id, guide);
    await insertAudit(tx, audit);
  });
}

export async function updatePlaceWithGuide(
  placeId: string,
  patch: Partial<NewPlace>,
  guide: PlaceGuideFields | null,
  audit: AuditEntry
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.update(places).set(patch).where(eq(places.id, placeId));
    if (guide && Object.keys(guide).length > 0) await upsertGuide(tx, placeId, guide);
    await insertAudit(tx, audit);
  });
}

export async function updatePlaceStatus(placeId: string, status: PlaceStatus, audit: AuditEntry): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.update(places).set({ status, updatedAt: audit.at }).where(eq(places.id, placeId));
    await insertAudit(tx, audit);
  });
}

export async function listAuditLogs(offset: number, limit: number): Promise<AuditLog[]> {
  return db
    .select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
    .limit(limit + 1)
    .offset(offset);
}
