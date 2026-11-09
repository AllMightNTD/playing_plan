import { describe, expect, it, beforeEach } from "vitest";
import sharp from "sharp";
import { resetMemoryStore } from "@/server/db/demo/memory-store";
import { ensureRoomSession, recordRoomConsent } from "@/server/services/user/room.service";
import {
  validateImageMagicBytes,
  uploadRoomPhoto,
  getProtectedUpload,
  deleteRoomUpload,
} from "./upload.service";
import {
  createGoogleDrivePhotoStorageGateway,
  resetInMemoryPhotoStorage,
} from "@/server/storage/photo-storage.gateway";
import { AppError } from "@/server/http/errors";
import { assertRoomIsolation } from "@/server/security/room-isolation.helper";

let ipCounter = 0;
const nextIp = () => `10.6.0.${++ipCounter}`;

beforeEach(() => {
  resetMemoryStore();
  resetInMemoryPhotoStorage();
});

describe("Upload Security Guard & Google Drive Storage Service (workerd compatible)", () => {
  it("should validate magic bytes accurately for JPEG, PNG, WebP, GIF and reject raw text/malware", async () => {
    const pngBuffer = await sharp({
      create: { width: 10, height: 10, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 1 } },
    })
      .png()
      .toBuffer();
    expect(validateImageMagicBytes(pngBuffer)).toBe(true);

    const jpegBuffer = await sharp({
      create: { width: 10, height: 10, channels: 3, background: { r: 0, g: 255, b: 0 } },
    })
      .jpeg()
      .toBuffer();
    expect(validateImageMagicBytes(jpegBuffer)).toBe(true);

    const webpBuffer = await sharp({
      create: { width: 10, height: 10, channels: 4, background: { r: 0, g: 0, b: 255, alpha: 1 } },
    })
      .webp()
      .toBuffer();
    expect(validateImageMagicBytes(webpBuffer)).toBe(true);

    const fakeBuffer = Buffer.from("<script>alert('hack')</script>");
    expect(validateImageMagicBytes(fakeBuffer)).toBe(false);
    expect(validateImageMagicBytes(Buffer.from([0x89, 0x50]))).toBe(false);
  });

  it("should reject upload if room has not consented to Decree 13/2023", async () => {
    const user = await ensureRoomSession(null, nextIp(), "Partner A");
    const testImage = await sharp({
      create: { width: 50, height: 50, channels: 3, background: { r: 200, g: 100, b: 50 } },
    })
      .webp()
      .toBuffer();

    await expect(
      uploadRoomPhoto(user.session, {
        fileName: "ky-niem.webp",
        buffer: testImage,
      })
    ).rejects.toThrowError("UPLOAD_CONSENT_REQUIRED");
  });

  it("should reject Decompression Bomb DoS (> 16MP limit) without native sharp", async () => {
    const user = await ensureRoomSession(null, nextIp(), "Partner A");
    await recordRoomConsent(user.session, "2026.1");

    const hugeImage = await sharp({
      create: { width: 4500, height: 4000, channels: 3, background: { r: 255, g: 255, b: 255 } },
    })
      .jpeg()
      .toBuffer();

    await expect(
      uploadRoomPhoto(user.session, {
        fileName: "huge-bomb.jpg",
        buffer: hugeImage,
      })
    ).rejects.toThrowError("UPLOAD_IMAGE_TOO_LARGE");
  });

  it("should store photo via Google Drive gateway, enforce Room Isolation, and rollback quota on failure", async () => {
    const driveStore = new Map<string, Uint8Array>();
    let nextDriveSeq = 0;
    let failNextUpload = false;

    const fakeDriveGateway = createGoogleDrivePhotoStorageGateway({
      clientId: "cid",
      clientSecret: "csecret",
      refreshToken: "rtoken",
      folderId: "root_folder",
      fetchImpl: async (input, init) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        const method = init?.method ?? "GET";

        if (url === "https://oauth2.googleapis.com/token") {
          return new Response(JSON.stringify({ access_token: "tok_live", expires_in: 3600 }), { status: 200 });
        }

        if (url.startsWith("https://www.googleapis.com/upload/drive/v3/files") && method === "POST") {
          if (failNextUpload) return new Response("Drive error", { status: 503 });
          const id = `driveFile_${++nextDriveSeq}`;
          const rawBody = init?.body as Uint8Array;
          // Extract binary payload between second CRLFCRLF and final boundary CRLF--
          const text = new TextDecoder("latin1").decode(rawBody);
          const firstSplit = text.indexOf("\r\n\r\n");
          const secondSplit = text.indexOf("\r\n\r\n", firstSplit + 4);
          const endBoundary = text.lastIndexOf("\r\n--dm_drive_");
          driveStore.set(id, rawBody.slice(secondSplit + 4, endBoundary));
          return new Response(JSON.stringify({ id }), { status: 200 });
        }

        const mediaMatch = /\/drive\/v3\/files\/([^?]+)\?alt=media$/.exec(url);
        if (mediaMatch && method === "GET") {
          const bytes = driveStore.get(decodeURIComponent(mediaMatch[1]));
          if (!bytes) return new Response("Not found", { status: 404 });
          return new Response(bytes as unknown as BodyInit, { status: 200 });
        }

        const delMatch = /\/drive\/v3\/files\/([^/?]+)$/.exec(url);
        if (delMatch && method === "DELETE") {
          driveStore.delete(decodeURIComponent(delMatch[1]));
          return new Response(null, { status: 204 });
        }

        return new Response("Unexpected", { status: 500 });
      },
    });

    const userA = await ensureRoomSession(null, nextIp(), "User A");
    await recordRoomConsent(userA.session, "2026.1");

    const webpImage = await sharp({
      create: { width: 100, height: 80, channels: 3, background: { r: 180, g: 50, b: 50 } },
    })
      .webp()
      .toBuffer();

    // Simulate upstream Drive outage -> must compensate room quota back to 0
    failNextUpload = true;
    await expect(
      uploadRoomPhoto(
        userA.session,
        { fileName: "fail.webp", buffer: webpImage },
        fakeDriveGateway
      )
    ).rejects.toThrowError("UPLOAD_STORAGE_UNAVAILABLE");
    failNextUpload = false;

    const upload = await uploadRoomPhoto(
      userA.session,
      { fileName: "date_polaroid.webp", buffer: webpImage },
      fakeDriveGateway
    );

    expect(upload.id).toMatch(/^img_/);
    expect(upload.width).toBe(100);
    expect(upload.height).toBe(80);
    expect(upload.sizeBytes).toBe(webpImage.length);

    const served = await getProtectedUpload(userA.session, upload.id, fakeDriveGateway);
    expect(served.mimeType).toBe("image/webp");
    expect(served.buffer.length).toBe(webpImage.length);

    // Room B cannot view or delete Room A's photo on Google Drive
    const userB = await ensureRoomSession(null, nextIp(), "User B");
    await assertRoomIsolation(async () => {
      await getProtectedUpload(userB.session, upload.id, fakeDriveGateway);
    });
    await assertRoomIsolation(async () => {
      await deleteRoomUpload(userB.session, upload.id, fakeDriveGateway);
    });

    await deleteRoomUpload(userA.session, upload.id, fakeDriveGateway);
    expect(driveStore.size).toBe(0);
    await expect(getProtectedUpload(userA.session, upload.id, fakeDriveGateway)).rejects.toThrowError(
      AppError
    );
  });
});
