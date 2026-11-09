import { AppError, ERRORS } from "@/server/http/errors";

export const GDRIVE_REF_PREFIX = "gdrive:";
export const MEMORY_REF_PREFIX = "mem:";

const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id";
export const DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files";
const TOKEN_EXPIRY_SAFETY_MS = 60_000;
export const UPSTREAM_TIMEOUT_MS = 15_000;
export const DRIVE_ID_PATTERN = /^[A-Za-z0-9_-]{3,128}$/;

export interface PutPhotoInput {
  roomId: string;
  uploadId: string;
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
}

export interface PhotoStorageGateway {
  putPhoto(input: PutPhotoInput): Promise<{ storageRef: string }>;
  getPhoto(storageRef: string): Promise<Uint8Array | null>;
  deletePhoto(storageRef: string): Promise<void>;
  deleteRoomPhotos(roomId: string): Promise<void>;
}

export interface GoogleDriveGatewayConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  folderId?: string;
  fetchImpl?: typeof fetch;
  now?: () => number;
}

interface GlobalPhotoMemoryScope {
  __datematePhotoMemoryStore?: Map<string, Uint8Array>;
}

function getMemoryMap(): Map<string, Uint8Array> {
  const scope = globalThis as unknown as GlobalPhotoMemoryScope;
  scope.__datematePhotoMemoryStore ??= new Map<string, Uint8Array>();
  return scope.__datematePhotoMemoryStore;
}

export function resetInMemoryPhotoStorage(): void {
  getMemoryMap().clear();
}

export function createInMemoryPhotoStorageGateway(): PhotoStorageGateway {
  return {
    async putPhoto(input: PutPhotoInput): Promise<{ storageRef: string }> {
      const storageRef = `${MEMORY_REF_PREFIX}${input.roomId}/${input.uploadId}`;
      getMemoryMap().set(storageRef, new Uint8Array(input.bytes));
      return { storageRef };
    },
    async getPhoto(storageRef: string): Promise<Uint8Array | null> {
      const stored = getMemoryMap().get(storageRef);
      return stored ? new Uint8Array(stored) : null;
    },
    async deletePhoto(storageRef: string): Promise<void> {
      getMemoryMap().delete(storageRef);
    },
    async deleteRoomPhotos(roomId: string): Promise<void> {
      const prefix = `${MEMORY_REF_PREFIX}${roomId}/`;
      const store = getMemoryMap();
      for (const key of store.keys()) {
        if (key.startsWith(prefix)) {
          store.delete(key);
        }
      }
    },
  };
}

function extractDriveFileId(storageRef: string): string | null {
  if (!storageRef.startsWith(GDRIVE_REF_PREFIX)) return null;
  const id = storageRef.slice(GDRIVE_REF_PREFIX.length);
  return DRIVE_ID_PATTERN.test(id) ? id : null;
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, p) => sum + p.byteLength, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    merged.set(part, offset);
    offset += part.byteLength;
  }
  return merged;
}

function buildMultipartBody(
  metadata: Record<string, unknown>,
  mimeType: string,
  bytes: Uint8Array,
  boundary: string
): Uint8Array {
  const encoder = new TextEncoder();
  const preamble = encoder.encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`
  );
  const epilogue = encoder.encode(`\r\n--${boundary}--`);
  return concatBytes([preamble, bytes, epilogue]);
}

export function createAccessTokenProvider(config: GoogleDriveGatewayConfig): () => Promise<string> {
  const fetchImpl = config.fetchImpl ?? fetch;
  const now = config.now ?? Date.now;
  let cachedToken: string | null = null;
  let expiresAtMs = 0;
  let inFlight: Promise<string> | null = null;

  return async (): Promise<string> => {
    if (cachedToken && now() < expiresAtMs) return cachedToken;
    if (inFlight) return inFlight;

    inFlight = (async () => {
      try {
        const body = new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          refresh_token: config.refreshToken,
          grant_type: "refresh_token",
        });
        const res = await fetchImpl(OAUTH_TOKEN_URL, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: body.toString(),
          signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
        });
        if (!res.ok) {
          throw new AppError(ERRORS.UPLOAD.STORAGE_UNAVAILABLE);
        }
        const json = (await res.json()) as { access_token?: unknown; expires_in?: unknown };
        if (typeof json.access_token !== "string" || !json.access_token) {
          throw new AppError(ERRORS.UPLOAD.STORAGE_UNAVAILABLE);
        }
        const ttlSec = typeof json.expires_in === "number" ? json.expires_in : 3600;
        cachedToken = json.access_token;
        expiresAtMs = now() + Math.max(10_000, ttlSec * 1000 - TOKEN_EXPIRY_SAFETY_MS);
        return cachedToken;
      } catch (err) {
        if (err instanceof AppError) throw err;
        throw new AppError(ERRORS.UPLOAD.STORAGE_UNAVAILABLE);
      } finally {
        inFlight = null;
      }
    })();

    return inFlight;
  };
}

export function createGoogleDrivePhotoStorageGateway(
  config: GoogleDriveGatewayConfig
): PhotoStorageGateway {
  const fetchImpl = config.fetchImpl ?? fetch;
  const getAccessToken = createAccessTokenProvider(config);

  const deleteByDriveId = async (driveId: string, token: string): Promise<void> => {
    const res = await fetchImpl(`${DRIVE_FILES_URL}/${encodeURIComponent(driveId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (!res.ok && res.status !== 404) {
      throw new AppError(ERRORS.UPLOAD.STORAGE_UNAVAILABLE);
    }
  };

  return {
    async putPhoto(input: PutPhotoInput): Promise<{ storageRef: string }> {
      const token = await getAccessToken();
      const boundary = `dm_drive_${input.uploadId}`;
      const metadata: Record<string, unknown> = {
        name: `${input.uploadId}_${input.fileName}`,
        mimeType: input.mimeType,
        appProperties: { roomId: input.roomId, uploadId: input.uploadId },
        ...(config.folderId ? { parents: [config.folderId] } : {}),
      };
      const payload = buildMultipartBody(metadata, input.mimeType, input.bytes, boundary);

      let res: Response;
      try {
        res = await fetchImpl(DRIVE_UPLOAD_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": `multipart/related; boundary=${boundary}`,
          },
          body: payload as unknown as BodyInit,
          signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
        });
      } catch {
        throw new AppError(ERRORS.UPLOAD.STORAGE_UNAVAILABLE);
      }

      if (!res.ok) {
        throw new AppError(ERRORS.UPLOAD.STORAGE_UNAVAILABLE);
      }
      const created = (await res.json()) as { id?: unknown };
      if (typeof created.id !== "string" || !DRIVE_ID_PATTERN.test(created.id)) {
        throw new AppError(ERRORS.UPLOAD.STORAGE_UNAVAILABLE);
      }
      return { storageRef: `${GDRIVE_REF_PREFIX}${created.id}` };
    },

    async getPhoto(storageRef: string): Promise<Uint8Array | null> {
      if (storageRef.startsWith(MEMORY_REF_PREFIX)) {
        return createInMemoryPhotoStorageGateway().getPhoto(storageRef);
      }
      const driveId = extractDriveFileId(storageRef);
      if (!driveId) return null;

      const token = await getAccessToken();
      let res: Response;
      try {
        res = await fetchImpl(`${DRIVE_FILES_URL}/${encodeURIComponent(driveId)}?alt=media`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
        });
      } catch {
        throw new AppError(ERRORS.UPLOAD.STORAGE_UNAVAILABLE);
      }

      if (res.status === 404) return null;
      if (!res.ok) throw new AppError(ERRORS.UPLOAD.STORAGE_UNAVAILABLE);
      return new Uint8Array(await res.arrayBuffer());
    },

    async deletePhoto(storageRef: string): Promise<void> {
      if (storageRef.startsWith(MEMORY_REF_PREFIX)) {
        await createInMemoryPhotoStorageGateway().deletePhoto(storageRef);
        return;
      }
      const driveId = extractDriveFileId(storageRef);
      if (!driveId) return;
      const token = await getAccessToken();
      await deleteByDriveId(driveId, token);
    },

    async deleteRoomPhotos(roomId: string): Promise<void> {
      await createInMemoryPhotoStorageGateway().deleteRoomPhotos(roomId);
      const safeRoomId = roomId.replace(/['\\]/g, "");
      if (!safeRoomId) return;

      const token = await getAccessToken();
      const query = `trashed = false and appProperties has { key='roomId' and value='${safeRoomId}' }`;
      const url = `${DRIVE_FILES_URL}?q=${encodeURIComponent(query)}&fields=files(id)&pageSize=100`;
      const res = await fetchImpl(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      });
      if (!res.ok) return;

      const data = (await res.json()) as { files?: Array<{ id?: unknown }> };
      for (const file of data.files ?? []) {
        if (typeof file.id === "string" && DRIVE_ID_PATTERN.test(file.id)) {
          await deleteByDriveId(file.id, token);
        }
      }
    },
  };
}

export function isRealEnvValue(val: string | undefined): val is string {
  const trimmed = val?.trim();
  return Boolean(trimmed && !trimmed.startsWith("your-"));
}

let cachedDriveKey = "";
let cachedDriveGateway: PhotoStorageGateway | null = null;

/** Resolves Google Drive OAuth2 gateway in production, or offline RAM store in dev/test. */
export function getPhotoStorageGateway(): PhotoStorageGateway {
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim() || undefined;

  if (isRealEnvValue(clientId) && isRealEnvValue(clientSecret) && isRealEnvValue(refreshToken)) {
    const cacheKey = `${clientId}:${refreshToken}:${folderId ?? ""}`;
    if (!cachedDriveGateway || cachedDriveKey !== cacheKey) {
      cachedDriveKey = cacheKey;
      cachedDriveGateway = createGoogleDrivePhotoStorageGateway({
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim(),
        refreshToken: refreshToken.trim(),
        folderId: isRealEnvValue(folderId) ? folderId.trim() : undefined,
      });
    }
    return cachedDriveGateway;
  }

  return createInMemoryPhotoStorageGateway();
}
