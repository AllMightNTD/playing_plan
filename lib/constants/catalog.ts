export const PLACE_CATEGORIES = ["photo", "cafe", "food", "walk", "fun", "indoor", "nature"] as const;
export type PlaceCategory = (typeof PLACE_CATEGORIES)[number];

export const MOOD_KEYS = ["photo", "romantic", "chill", "fun", "food"] as const;
export type MoodKey = (typeof MOOD_KEYS)[number];

export const TIME_SLOTS = ["morning", "sunset", "night", "allday"] as const;
export type TimeSlot = (typeof TIME_SLOTS)[number];

export const TRANSPORT_MODES = ["motorbike", "car", "walk"] as const;
export type TransportMode = (typeof TRANSPORT_MODES)[number];

export const BUDGET_LEVEL_MIN = 1;
export const BUDGET_LEVEL_MAX = 3;
export const MAX_WIZARD_MOODS = 2;

export const PLACE_STATUS_PUBLISHED = "published";
export const DEFAULT_CITY = "hanoi";

export const MOOD_LABELS: Record<MoodKey, string> = {
  photo: "Chụp ảnh",
  romantic: "Lãng mạn",
  chill: "Chill",
  fun: "Vui chơi",
  food: "Ăn uống",
};

export const CATEGORY_LABELS: Record<PlaceCategory, string> = {
  photo: "Chụp ảnh",
  cafe: "Cà phê",
  food: "Ăn uống",
  walk: "Dạo bộ",
  fun: "Vui chơi",
  indoor: "Trong nhà",
  nature: "Thiên nhiên",
};

/** Hình ảnh mặc định theo danh mục khi địa điểm chưa có ảnh bìa riêng. */
export const CATEGORY_VISUALS: Record<PlaceCategory, { emoji: string; coverGradient: string }> = {
  photo: { emoji: "📸", coverGradient: "from-[#D96B43] via-[#E89973] to-[#4A5568]" },
  cafe: { emoji: "☕", coverGradient: "from-[#6B4F4F] via-[#A47551] to-[#E8C39E]" },
  food: { emoji: "🍜", coverGradient: "from-[#C93F52] via-[#E07A5F] to-[#F2CC8F]" },
  walk: { emoji: "🚶", coverGradient: "from-[#2A6F4E] via-[#7A9E87] to-[#E9EDC9]" },
  fun: { emoji: "🎡", coverGradient: "from-[#5E60CE] via-[#7400B8] to-[#F72585]" },
  indoor: { emoji: "🏛️", coverGradient: "from-[#3E5C76] via-[#748CAB] to-[#F0EBD8]" },
  nature: { emoji: "🌿", coverGradient: "from-[#386641] via-[#6A994E] to-[#A7C957]" },
};

/** Khung giờ phù hợp theo danh mục (dùng cho tiêu chí "Hợp khung giờ" của Wizard F05). */
export const CATEGORY_BEST_SLOTS: Record<PlaceCategory, TimeSlot[]> = {
  photo: ["morning", "sunset"],
  nature: ["morning", "sunset"],
  fun: ["morning", "sunset"],
  walk: ["morning", "sunset", "night"],
  cafe: ["morning", "sunset", "night"],
  indoor: ["morning", "sunset", "night"],
  food: ["sunset", "night"],
};

/** 0 = Chủ nhật ... 6 = Thứ 7 (theo Date.getDay()). */
export const WEEKDAY_LABELS = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"] as const;
