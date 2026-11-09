import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { AppError } from "@/server/http/errors";
import {
  assertValidImageHeader,
  MAX_IMAGE_PIXELS,
  validateImageMagicBytes,
} from "./image-header";

describe("Pure-JS Image Header Guard (workerd compatible)", () => {
  it("should validate magic bytes for PNG, JPEG, WebP, GIF and reject scripts or short buffers", async () => {
    const png = await sharp({
      create: { width: 16, height: 12, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 1 } },
    })
      .png()
      .toBuffer();
    const jpeg = await sharp({
      create: { width: 24, height: 18, channels: 3, background: { r: 0, g: 255, b: 0 } },
    })
      .jpeg()
      .toBuffer();
    const webp = await sharp({
      create: { width: 32, height: 20, channels: 4, background: { r: 0, g: 0, b: 255, alpha: 0.5 } },
    })
      .webp()
      .toBuffer();
    const gif = await sharp({
      create: { width: 14, height: 10, channels: 4, background: { r: 120, g: 120, b: 0, alpha: 1 } },
    })
      .gif()
      .toBuffer();

    expect(validateImageMagicBytes(png)).toBe(true);
    expect(validateImageMagicBytes(jpeg)).toBe(true);
    expect(validateImageMagicBytes(webp)).toBe(true);
    expect(validateImageMagicBytes(gif)).toBe(true);

    expect(validateImageMagicBytes(Buffer.from("<script>alert(1)</script>"))).toBe(false);
    expect(validateImageMagicBytes(new Uint8Array([0x89, 0x50, 0x4e]))).toBe(false);
    expect(validateImageMagicBytes(new Uint8Array(0))).toBe(false);
  });

  it("should extract exact dimensions and mimeType across PNG, baseline/progressive JPEG, lossy/lossless/alpha WebP, and GIF", async () => {
    const png = await sharp({
      create: { width: 123, height: 87, channels: 4, background: { r: 10, g: 20, b: 30, alpha: 1 } },
    })
      .png()
      .toBuffer();
    expect(assertValidImageHeader(png)).toEqual({
      mimeType: "image/png",
      extension: "png",
      width: 123,
      height: 87,
    });

    const progressiveJpeg = await sharp({
      create: { width: 321, height: 210, channels: 3, background: { r: 90, g: 40, b: 10 } },
    })
      .withMetadata()
      .jpeg({ progressive: true })
      .toBuffer();
    expect(assertValidImageHeader(progressiveJpeg)).toEqual({
      mimeType: "image/jpeg",
      extension: "jpg",
      width: 321,
      height: 210,
    });

    const lossyWebp = await sharp({
      create: { width: 140, height: 95, channels: 3, background: { r: 50, g: 60, b: 70 } },
    })
      .webp({ lossless: false })
      .toBuffer();
    expect(assertValidImageHeader(lossyWebp)).toEqual({
      mimeType: "image/webp",
      extension: "webp",
      width: 140,
      height: 95,
    });

    const losslessWebp = await sharp({
      create: { width: 64, height: 48, channels: 4, background: { r: 50, g: 60, b: 70, alpha: 0.4 } },
    })
      .webp({ lossless: true })
      .toBuffer();
    expect(assertValidImageHeader(losslessWebp)).toEqual({
      mimeType: "image/webp",
      extension: "webp",
      width: 64,
      height: 48,
    });

    const alphaWebp = await sharp({
      create: { width: 110, height: 75, channels: 4, background: { r: 200, g: 10, b: 90, alpha: 0.5 } },
    })
      .webp({ lossless: false })
      .toBuffer();
    expect(assertValidImageHeader(alphaWebp)).toEqual({
      mimeType: "image/webp",
      extension: "webp",
      width: 110,
      height: 75,
    });

    const gif = await sharp({
      create: { width: 55, height: 44, channels: 4, background: { r: 10, g: 200, b: 90, alpha: 1 } },
    })
      .gif()
      .toBuffer();
    expect(assertValidImageHeader(gif)).toEqual({
      mimeType: "image/gif",
      extension: "gif",
      width: 55,
      height: 44,
    });
  });

  it("should reject corrupt or forged headers that start with valid magic bytes", () => {
    // Forged PNG magic bytes without valid IHDR dimensions
    const forgedPng = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    ]);
    expect(() => assertValidImageHeader(forgedPng)).toThrowError("UPLOAD_INVALID_IMAGE");

    // Forged JPEG magic bytes without SOF marker
    const forgedJpeg = new Uint8Array([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    ]);
    expect(() => assertValidImageHeader(forgedJpeg)).toThrowError("UPLOAD_INVALID_IMAGE");
  });

  it("should reject decompression bomb exceeding 16MP limit without decoding pixels", async () => {
    expect(MAX_IMAGE_PIXELS).toBe(16_777_216);

    const bombJpeg = await sharp({
      create: { width: 4500, height: 4000, channels: 3, background: { r: 255, g: 255, b: 255 } },
    })
      .jpeg()
      .toBuffer();

    expect(() => assertValidImageHeader(bombJpeg)).toThrowError(AppError);
    expect(() => assertValidImageHeader(bombJpeg)).toThrowError("UPLOAD_IMAGE_TOO_LARGE");
  });
});
