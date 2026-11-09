import { AppError, ERRORS } from "@/server/http/errors";

export const MAX_IMAGE_PIXELS = 16_777_216;
const MIN_SNIFF_BYTES = 12;

export type SupportedImageMime = "image/jpeg" | "image/png" | "image/webp" | "image/gif";
export type SupportedImageExtension = "jpg" | "png" | "webp" | "gif";

export interface ValidatedImageHeader {
  mimeType: SupportedImageMime;
  extension: SupportedImageExtension;
  width: number;
  height: number;
}

function readUint16BE(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

function readUint16LE(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function readUint24LE(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

function readUint32BE(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] * 0x1000000) +
    ((bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3])
  );
}

function readUint32LE(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16)) +
    bytes[offset + 3] * 0x1000000
  );
}

function isJpegMagic(bytes: Uint8Array): boolean {
  return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

function isPngMagic(bytes: Uint8Array): boolean {
  return (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  );
}

function isWebpMagic(bytes: Uint8Array): boolean {
  return (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  );
}

function isGifMagic(bytes: Uint8Array): boolean {
  return (
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  );
}

/** Fast binary magic-bytes check for JPEG, PNG, WebP, and GIF without native addons. */
export function validateImageMagicBytes(bytes: Uint8Array): boolean {
  if (bytes.length < MIN_SNIFF_BYTES) return false;
  return isJpegMagic(bytes) || isPngMagic(bytes) || isWebpMagic(bytes) || isGifMagic(bytes);
}

function parsePngDimensions(bytes: Uint8Array): ValidatedImageHeader | null {
  if (bytes.length < 24) return null;
  const isIhdr =
    bytes[12] === 0x49 && bytes[13] === 0x48 && bytes[14] === 0x44 && bytes[15] === 0x52;
  if (!isIhdr) return null;
  return {
    mimeType: "image/png",
    extension: "png",
    width: readUint32BE(bytes, 16),
    height: readUint32BE(bytes, 20),
  };
}

function parseGifDimensions(bytes: Uint8Array): ValidatedImageHeader | null {
  if (bytes.length < 10) return null;
  return {
    mimeType: "image/gif",
    extension: "gif",
    width: readUint16LE(bytes, 6),
    height: readUint16LE(bytes, 8),
  };
}

function parseWebpDimensions(bytes: Uint8Array): ValidatedImageHeader | null {
  if (bytes.length < 25) return null;
  const c0 = bytes[12];
  const c1 = bytes[13];
  const c2 = bytes[14];
  const c3 = bytes[15];
  if (c0 !== 0x56 || c1 !== 0x50 || c2 !== 0x38) return null;

  // VP8 lossy bitstream
  if (c3 === 0x20) {
    if (bytes.length < 30 || bytes[23] !== 0x9d || bytes[24] !== 0x01 || bytes[25] !== 0x2a) {
      return null;
    }
    return {
      mimeType: "image/webp",
      extension: "webp",
      width: readUint16LE(bytes, 26) & 0x3fff,
      height: readUint16LE(bytes, 28) & 0x3fff,
    };
  }

  // VP8L lossless bitstream
  if (c3 === 0x4c) {
    if (bytes[20] !== 0x2f) return null;
    const packed = readUint32LE(bytes, 21);
    return {
      mimeType: "image/webp",
      extension: "webp",
      width: (packed & 0x3fff) + 1,
      height: ((packed >>> 14) & 0x3fff) + 1,
    };
  }

  // VP8X extended header (alpha / ICC / EXIF / animation)
  if (c3 === 0x58 && bytes.length >= 30) {
    return {
      mimeType: "image/webp",
      extension: "webp",
      width: readUint24LE(bytes, 24) + 1,
      height: readUint24LE(bytes, 27) + 1,
    };
  }

  return null;
}

function isJpegSofMarker(marker: number): boolean {
  return (
    marker >= 0xc0 &&
    marker <= 0xcf &&
    marker !== 0xc4 &&
    marker !== 0xc8 &&
    marker !== 0xcc
  );
}

function parseJpegDimensions(bytes: Uint8Array): ValidatedImageHeader | null {
  let offset = 2;
  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    while (offset < bytes.length && bytes[offset] === 0xff) {
      offset += 1;
    }
    if (offset >= bytes.length) return null;

    const marker = bytes[offset];
    offset += 1;

    if (marker === 0xd9 || marker === 0xda) return null;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) continue;
    if (offset + 2 > bytes.length) return null;

    const segmentLength = readUint16BE(bytes, offset);
    if (segmentLength < 2 || offset + segmentLength > bytes.length) return null;

    if (isJpegSofMarker(marker)) {
      if (segmentLength < 7) return null;
      return {
        mimeType: "image/jpeg",
        extension: "jpg",
        height: readUint16BE(bytes, offset + 3),
        width: readUint16BE(bytes, offset + 5),
      };
    }

    offset += segmentLength;
  }
  return null;
}

/**
 * Validates binary magic bytes, extracts width/height without pixel decoding,
 * and enforces the 16MP decompression-bomb ceiling.
 */
export function assertValidImageHeader(bytes: Uint8Array): ValidatedImageHeader {
  if (!validateImageMagicBytes(bytes)) {
    throw new AppError(ERRORS.UPLOAD.INVALID_IMAGE);
  }

  let parsed: ValidatedImageHeader | null = null;
  if (isPngMagic(bytes)) parsed = parsePngDimensions(bytes);
  else if (isJpegMagic(bytes)) parsed = parseJpegDimensions(bytes);
  else if (isWebpMagic(bytes)) parsed = parseWebpDimensions(bytes);
  else if (isGifMagic(bytes)) parsed = parseGifDimensions(bytes);

  if (!parsed || parsed.width <= 0 || parsed.height <= 0) {
    throw new AppError(ERRORS.UPLOAD.INVALID_IMAGE);
  }

  if (parsed.width * parsed.height > MAX_IMAGE_PIXELS) {
    throw new AppError(ERRORS.UPLOAD.IMAGE_TOO_LARGE);
  }

  return parsed;
}
