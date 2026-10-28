import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { assertDatabaseConfigured } from "@/server/db/client";
import {
  findAdminPlace,
  findPlaceIdBySlug,
  insertPlaceWithGuide,
  listAdminPlaces,
  listAuditLogs,
  updatePlaceStatus,
  updatePlaceWithGuide,
  type AdminPlaceRow,
  type AuditEntry,
} from "@/server/db/queries/admin/places.queries";
import { collectPublishIssues } from "@/server/services/admin/place-admin.policy";
import { buildPlaceSearchFields, normalizeVietnamese, toSlug } from "@/lib/search";
import { DEFAULT_CITY } from "@/lib/constants/catalog";
import { omitUndefined } from "@/lib/utils";
import { AppError, ERRORS } from "@/server/http/errors";
import type { AdminIdentity } from "@/server/auth/admin-auth";
import type { AuditLog, NewPlace, Place, PlaceGuide } from "@/server/db/schema";
import type { Page } from "@/lib/catalog-filter";
import type { AdminPlaceListQuery, CreatePlaceBody, PlaceStatus, UpdatePlaceBody } from "@/lib/validators/admin";

export type AdminPlaceDto = Omit<Place, "searchName" | "searchText" | "lat" | "lng"> & {
  lat: number;
  lng: number;
  guide: Omit<PlaceGuide, "placeId"> | null;
};

const COORDINATE_DECIMALS = 6;

function toAdminPlaceDto(place: Place, guide: PlaceGuide | null): AdminPlaceDto {
  const { searchName: _searchName, searchText: _searchText, lat, lng, ...fields } = place;
  const guideFields = guide ? (({ placeId: _placeId, ...rest }) => rest)(guide) : null;
  return { ...fields, lat: Number(lat), lng: Number(lng), guide: guideFields };
}

function toCoordinateColumns(lat: number, lng: number): Pick<NewPlace, "lat" | "lng"> {
  return { lat: lat.toFixed(COORDINATE_DECIMALS), lng: lng.toFixed(COORDINATE_DECIMALS) };
}

function toOffsetPage<T>(rows: T[], offset: number, limit: number): Page<T> {
  return {
    items: rows.slice(0, limit),
    nextCursor: rows.length > limit ? String(offset + limit) : null,
  };
}

function toAudit(admin: AdminIdentity, action: AuditEntry["action"], targetId: string, changes: Record<string, unknown>): AuditEntry {
  return { adminEmail: admin.email, action, targetId, changes, at: new Date() };
}

/** Mục 3.5: hủy cache ISR để người dùng thấy nội dung mới ngay. */
function revalidateCatalog(slugs: string[]): void {
  for (const slug of new Set(slugs)) revalidatePath(`/places/${slug}`);
  revalidatePath("/explore");
  revalidatePath("/");
}

async function loadPlaceOrThrow(placeId: string): Promise<{ place: Place; guide: PlaceGuide | null }> {
  assertDatabaseConfigured();
  const row = await findAdminPlace(placeId);
  if (!row) throw new AppError(ERRORS.PLACE.NOT_FOUND);
  return row;
}

async function assertSlugAvailable(slug: string, exceptPlaceId?: string): Promise<void> {
  if (!slug) throw new AppError(ERRORS.COMMON.VALIDATION_FAILED, { slug: "SLUG_REQUIRED" });
  const ownerId = await findPlaceIdBySlug(slug);
  if (ownerId && ownerId !== exceptPlaceId) throw new AppError(ERRORS.PLACE.SLUG_TAKEN);
}

export async function listPlacesForAdmin(query: AdminPlaceListQuery): Promise<Page<AdminPlaceRow>> {
  assertDatabaseConfigured();
  const offset = query.cursor ? Number(query.cursor) : 0;
  const rows = await listAdminPlaces({
    status: query.status,
    searchName: query.q ? normalizeVietnamese(query.q) : undefined,
    offset,
    limit: query.limit,
  });
  return toOffsetPage(rows, offset, query.limit);
}

export async function getPlaceForAdmin(placeId: string): Promise<AdminPlaceDto> {
  const { place, guide } = await loadPlaceOrThrow(placeId);
  return toAdminPlaceDto(place, guide);
}

/** Địa điểm mới luôn ở trạng thái nháp; xuất bản là bước riêng có kiểm tra (F16). */
export async function createPlace(admin: AdminIdentity, input: CreatePlaceBody): Promise<AdminPlaceDto> {
  assertDatabaseConfigured();
  const { guide = {}, slug: requestedSlug, lat, lng, ...fields } = input;
  const slug = requestedSlug ?? toSlug(fields.name);
  await assertSlugAvailable(slug);

  const audit = toAudit(admin, "create", nanoid(21), { slug });
  await insertPlaceWithGuide(
    {
      ...fields,
      ...toCoordinateColumns(lat, lng),
      ...buildPlaceSearchFields(fields),
      id: audit.targetId,
      slug,
      city: DEFAULT_CITY,
      status: "draft",
      createdAt: audit.at,
      updatedAt: audit.at,
    },
    guide,
    audit
  );
  return getPlaceForAdmin(audit.targetId);
}

export async function updatePlace(admin: AdminIdentity, placeId: string, input: UpdatePlaceBody): Promise<AdminPlaceDto> {
  const { place: existing } = await loadPlaceOrThrow(placeId);
  const { guide, lat, lng, ...fields } = input;
  const changedFields = omitUndefined(fields);
  if (changedFields.slug && changedFields.slug !== existing.slug) await assertSlugAvailable(changedFields.slug, placeId);

  const merged = { ...existing, ...changedFields };
  const hasCoordinates = lat !== undefined || lng !== undefined;
  const audit = toAudit(admin, "update", placeId, { fields: Object.keys(omitUndefined(input)) });

  await updatePlaceWithGuide(
    placeId,
    {
      ...changedFields,
      ...buildPlaceSearchFields(merged),
      ...(hasCoordinates ? toCoordinateColumns(lat ?? Number(existing.lat), lng ?? Number(existing.lng)) : {}),
      updatedAt: audit.at,
    },
    guide ?? null,
    audit
  );

  if (existing.status === "published") revalidateCatalog([existing.slug, merged.slug]);
  return getPlaceForAdmin(placeId);
}

async function changePlaceStatus(
  admin: AdminIdentity,
  place: Place,
  status: PlaceStatus,
  action: AuditEntry["action"]
): Promise<AdminPlaceDto> {
  await updatePlaceStatus(place.id, status, toAudit(admin, action, place.id, { from: place.status, to: status }));
  revalidateCatalog([place.slug]);
  return getPlaceForAdmin(place.id);
}

export async function publishPlace(admin: AdminIdentity, placeId: string): Promise<AdminPlaceDto> {
  const { place, guide } = await loadPlaceOrThrow(placeId);
  const issues = collectPublishIssues(place, guide);
  if (Object.keys(issues).length > 0) throw new AppError(ERRORS.PLACE.NOT_READY_TO_PUBLISH, issues);
  return changePlaceStatus(admin, place, "published", "publish");
}

/** Gỡ khỏi catalog (xóa mềm): dữ liệu vẫn giữ để khôi phục, kế hoạch cũ không bị gãy. */
export async function hidePlace(admin: AdminIdentity, placeId: string): Promise<AdminPlaceDto> {
  const { place } = await loadPlaceOrThrow(placeId);
  return changePlaceStatus(admin, place, "hidden", "hide");
}

export async function listAuditLogsForAdmin(cursor: string | undefined, limit: number): Promise<Page<AuditLog>> {
  assertDatabaseConfigured();
  const offset = cursor ? Number(cursor) : 0;
  return toOffsetPage(await listAuditLogs(offset, limit), offset, limit);
}
