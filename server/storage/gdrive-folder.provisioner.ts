import { AppError, ERRORS } from "@/server/http/errors";
import {
  DRIVE_FILES_URL,
  DRIVE_ID_PATTERN,
  UPSTREAM_TIMEOUT_MS,
  createAccessTokenProvider,
  type GoogleDriveGatewayConfig,
} from "./photo-storage.gateway";

export const DEFAULT_GDRIVE_FOLDER_NAME = "DateMate_Memories";

const DRIVE_FOLDER_MIME = "application/vnd.google-apps.folder";
const MAX_FOLDER_NAME_LENGTH = 120;

export interface EnsureGoogleDriveFolderInput extends Omit<GoogleDriveGatewayConfig, "folderId"> {
  folderName?: string;
  parentFolderId?: string;
}

export interface EnsureGoogleDriveFolderResult {
  folderId: string;
  folderName: string;
  created: boolean;
}

function sanitizeDriveQueryLiteral(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function resolveTargetFolderName(folderName: string | undefined): string {
  if (folderName === undefined) return DEFAULT_GDRIVE_FOLDER_NAME;
  const trimmed = folderName.trim();
  if (!trimmed || trimmed.length > MAX_FOLDER_NAME_LENGTH) {
    throw new AppError(ERRORS.COMMON.VALIDATION_FAILED, { folderName: "invalid" });
  }
  return trimmed;
}

function resolveParentFolderId(parentFolderId: string | undefined): string | undefined {
  if (parentFolderId === undefined) return undefined;
  const trimmed = parentFolderId.trim();
  if (!DRIVE_ID_PATTERN.test(trimmed)) {
    throw new AppError(ERRORS.COMMON.VALIDATION_FAILED, { parentFolderId: "invalid" });
  }
  return trimmed;
}

async function findExistingAppFolderId(
  fetchImpl: typeof fetch,
  token: string,
  folderName: string,
  parentFolderId?: string
): Promise<string | null> {
  const safeName = sanitizeDriveQueryLiteral(folderName);
  const parentClause = parentFolderId ? ` and '${parentFolderId}' in parents` : "";
  const query = `mimeType = '${DRIVE_FOLDER_MIME}' and trashed = false and name = '${safeName}'${parentClause}`;
  const url = `${DRIVE_FILES_URL}?q=${encodeURIComponent(query)}&fields=files(id,name)&pageSize=10`;

  let res: Response;
  try {
    res = await fetchImpl(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch {
    throw new AppError(ERRORS.UPLOAD.STORAGE_UNAVAILABLE);
  }
  if (!res.ok) throw new AppError(ERRORS.UPLOAD.STORAGE_UNAVAILABLE);

  const data = (await res.json()) as { files?: Array<{ id?: unknown }> };
  for (const file of data.files ?? []) {
    if (typeof file.id === "string" && DRIVE_ID_PATTERN.test(file.id)) {
      return file.id;
    }
  }
  return null;
}

async function createAppFolder(
  fetchImpl: typeof fetch,
  token: string,
  folderName: string,
  parentFolderId?: string
): Promise<string> {
  const metadata: Record<string, unknown> = {
    name: folderName,
    mimeType: DRIVE_FOLDER_MIME,
    ...(parentFolderId ? { parents: [parentFolderId] } : {}),
  };

  let res: Response;
  try {
    res = await fetchImpl(`${DRIVE_FILES_URL}?fields=id,name`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify(metadata),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch {
    throw new AppError(ERRORS.UPLOAD.STORAGE_UNAVAILABLE);
  }
  if (!res.ok) throw new AppError(ERRORS.UPLOAD.STORAGE_UNAVAILABLE);

  const created = (await res.json()) as { id?: unknown };
  if (typeof created.id !== "string" || !DRIVE_ID_PATTERN.test(created.id)) {
    throw new AppError(ERRORS.UPLOAD.STORAGE_UNAVAILABLE);
  }
  return created.id;
}

const inFlightFolderEnsure = new Map<string, Promise<EnsureGoogleDriveFolderResult>>();

/** Idempotently finds or creates an app-owned Google Drive folder compatible with drive.file scope. */
export async function ensureGoogleDriveFolder(
  input: EnsureGoogleDriveFolderInput
): Promise<EnsureGoogleDriveFolderResult> {
  const folderName = resolveTargetFolderName(input.folderName);
  const parentFolderId = resolveParentFolderId(input.parentFolderId);
  const dedupeKey = `${input.clientId}:${input.refreshToken}:${folderName}:${parentFolderId ?? ""}`;

  const active = inFlightFolderEnsure.get(dedupeKey);
  if (active) return active;

  const task = (async (): Promise<EnsureGoogleDriveFolderResult> => {
    try {
      const fetchImpl = input.fetchImpl ?? fetch;
      const token = await createAccessTokenProvider(input)();
      const existingId = await findExistingAppFolderId(fetchImpl, token, folderName, parentFolderId);
      if (existingId) {
        return { folderId: existingId, folderName, created: false };
      }
      const createdId = await createAppFolder(fetchImpl, token, folderName, parentFolderId);
      return { folderId: createdId, folderName, created: true };
    } finally {
      inFlightFolderEnsure.delete(dedupeKey);
    }
  })();

  inFlightFolderEnsure.set(dedupeKey, task);
  return task;
}

