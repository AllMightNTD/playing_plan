import { normalizeVietnamese } from "./search.ts";

export interface VideoChapter {
  timestampSec: number;
  label: string;
}

// Dòng chapter YouTube: "0:17 Lạc Êm", "(02:10) Đền Ngọc Sơn", "1:02:03 - Hồ Tây"
const CHAPTER_LINE = /^\s*\(?((?:\d{1,2}:)?\d{1,2}:\d{2})\)?\s*[-–—:|.]?\s*(.+?)\s*$/;
const MIN_CHAPTERS = 2;
/** Tên địa điểm quá ngắn ("Hồ", "Chợ") dễ khớp nhầm nên bỏ qua. */
const MIN_PLACE_NAME_LENGTH = 5;

function toSeconds(timestamp: string): number {
  return timestamp.split(":").reduce((total, part) => total * 60 + Number(part), 0);
}

/**
 * Tách chapter từ mô tả video. YouTube chỉ nhận chapter khi có từ 2 mốc trở lên,
 * nên mô tả chỉ có 1 dòng giờ (thường là giờ mở cửa) không được tính.
 */
export function parseVideoChapters(description: string | null | undefined): VideoChapter[] {
  const chapters: VideoChapter[] = [];
  for (const line of (description ?? "").split(/\r?\n/)) {
    const match = CHAPTER_LINE.exec(line);
    if (!match) continue;
    const label = match[2].replace(/^[-–—:|.\s]+/, "").trim();
    if (label) chapters.push({ timestampSec: toSeconds(match[1]), label: label.slice(0, 200) });
  }
  return chapters.length >= MIN_CHAPTERS ? chapters : [];
}

/** Khớp tên chapter với địa điểm: tên địa điểm (đã bỏ dấu) phải nằm trọn trong nhãn; ưu tiên tên dài nhất. */
export function matchChapterToPlace<T extends { id: string; name: string }>(label: string, places: T[]): T | null {
  const normalizedLabel = ` ${normalizeVietnamese(label)} `;
  let best: { place: T; length: number } | null = null;
  for (const place of places) {
    const normalizedName = normalizeVietnamese(place.name);
    if (normalizedName.length < MIN_PLACE_NAME_LENGTH) continue;
    if (normalizedLabel.includes(` ${normalizedName} `) && (!best || normalizedName.length > best.length)) {
      best = { place, length: normalizedName.length };
    }
  }
  return best?.place ?? null;
}

export function formatTimestamp(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}
