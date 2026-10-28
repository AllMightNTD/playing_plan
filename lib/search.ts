// Import tương đối kèm đuôi .ts để script Node thuần (scripts/*.ts) dùng lại được; alias "@/" chỉ chạy trong Next/Vitest.
import { CATEGORY_LABELS, MOOD_LABELS, type MoodKey, type PlaceCategory } from "./constants/catalog.ts";

const MAX_SLUG_LENGTH = 120;

/**
 * Chuẩn hóa chuỗi tiếng Việt bỏ dấu, đưa về chữ thường
 * Áp dụng cho cả lúc index lẫn lúc người dùng tìm kiếm
 */
export function normalizeVietnamese(str: string): string {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Bỏ dấu thanh
    .replace(/[đĐ]/g, "d")           // Đổi đ/Đ thành d
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")        // Bỏ ký tự đặc biệt
    .replace(/\s+/g, " ")            // Gom khoảng trắng
    .trim();
}

/**
 * Xếp hạng điểm số tìm kiếm trong code (In-memory scoring)
 */
export function scoreSearchMatch(
  queryNorm: string,
  targetNameNorm: string,
  targetTextNorm: string = ""
): number {
  if (!queryNorm) return 0;
  let score = 0;

  // Khớp chính xác tên
  if (targetNameNorm === queryNorm) {
    score += 100;
  } else if (targetNameNorm.startsWith(queryNorm)) {
    score += 60;
  } else if (targetNameNorm.includes(queryNorm)) {
    score += 40;
  }

  // Tách từ khóa để so khớp từng từ
  const words = queryNorm.split(" ").filter((w) => w.length > 0);
  for (const word of words) {
    if (targetNameNorm.includes(word)) {
      score += 15;
    } else if (targetTextNorm.includes(word)) {
      score += 5;
    }
  }

  return score;
}

/** Slug URL từ tên tiếng Việt: "Cầu Long Biên" → "cau-long-bien". */
export function toSlug(name: string): string {
  return normalizeVietnamese(name)
    .replace(/_/g, " ")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/, "");
}

export interface SearchablePlaceFields {
  name: string;
  area: string;
  category: PlaceCategory;
  moods: string[];
  tags: string[];
  summary: string;
}

/**
 * F22: dựng cột search_name/search_text đã bỏ dấu; tên lặp 2 lần để tăng trọng số khi xếp hạng.
 */
export function buildPlaceSearchFields(place: SearchablePlaceFields): { searchName: string; searchText: string } {
  const moodLabels = place.moods.map((mood) => MOOD_LABELS[mood as MoodKey] ?? mood);
  const searchName = normalizeVietnamese(place.name);
  const searchText = normalizeVietnamese(
    [place.name, place.name, place.area, CATEGORY_LABELS[place.category], ...moodLabels, ...place.tags, place.summary].join(" ")
  );
  return { searchName, searchText };
}
