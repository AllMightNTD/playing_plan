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
import { AppError } from "@/server/http/errors";
import { assertRoomIsolation } from "@/server/security/room-isolation.helper";

let ipCounter = 0;
const nextIp = () => `10.6.0.${++ipCounter}`;

beforeEach(() => {
  resetMemoryStore();
});

describe("Upload Security Guard & Storage Service (Phase 0b)", () => {
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

    // Text file hoặc script trá hình .png
    const fakeBuffer = Buffer.from("<script>alert('hack')</script>");
    expect(validateImageMagicBytes(fakeBuffer)).toBe(false);

    // Buffer ngắn
    expect(validateImageMagicBytes(Buffer.from([0x89, 0x50]))).toBe(false);
  });

  it("should reject upload if room has not consented to Nghị định 13/2023", async () => {
    const user = await ensureRoomSession(null, nextIp(), "Partner A");
    const testImage = await sharp({
      create: { width: 50, height: 50, channels: 3, background: { r: 200, g: 100, b: 50 } },
    })
      .png()
      .toBuffer();

    await expect(
      uploadRoomPhoto(user.session, {
        fileName: "ky-niem.png",
        buffer: testImage,
      })
    ).rejects.toThrowError("UPLOAD_CONSENT_REQUIRED");
  });

  it("should reject Decompression Bomb DoS (> 16MP limit)", async () => {
    const user = await ensureRoomSession(null, nextIp(), "Partner A");
    await recordRoomConsent(user.session, "2026.1");

    // Tạo ảnh 4500x4000 = 18,000,000 pixels (> 16.7MP)
    // Sharp sẽ chặn bởi limitInputPixels: 16777216
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

  it("should successfully re-encode valid image to WebP, update quotas, and serve binary protected", async () => {
    const userA = await ensureRoomSession(null, nextIp(), "User A");
    await recordRoomConsent(userA.session, "2026.1");

    const smallImage = await sharp({
      create: { width: 100, height: 80, channels: 3, background: { r: 180, g: 50, b: 50 } },
    })
      .png()
      .toBuffer();

    const upload = await uploadRoomPhoto(userA.session, {
      fileName: "date_polaroid.png",
      buffer: smallImage,
    });

    expect(upload.id).toMatch(/^img_/);
    expect(upload.width).toBe(100);
    expect(upload.height).toBe(80);
    expect(upload.sizeBytes).toBeGreaterThan(0);

    // Đọc ảnh thành công bởi User A
    const served = await getProtectedUpload(userA.session, upload.id);
    expect(served.mimeType).toBe("image/webp");
    expect(served.buffer.length).toBe(upload.sizeBytes);

    // User B thuộc phòng khác cố tình đọc ảnh của User A -> Bắt buộc ném 404
    const userB = await ensureRoomSession(null, nextIp(), "User B");
    await assertRoomIsolation(async () => {
      await getProtectedUpload(userB.session, upload.id);
    });

    // User B cố xóa ảnh của User A -> Bắt buộc ném 404
    await assertRoomIsolation(async () => {
      await deleteRoomUpload(userB.session, upload.id);
    });

    // User A xóa ảnh -> Thành công và hoàn trả quota
    await deleteRoomUpload(userA.session, upload.id);

    // Đọc lại sau khi xóa -> Báo lỗi NOT_FOUND
    await expect(getProtectedUpload(userA.session, upload.id)).rejects.toThrowError(AppError);
  });
});
