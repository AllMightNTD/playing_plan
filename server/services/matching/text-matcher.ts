/**
 * Bộ công cụ chuẩn hóa văn bản tiếng Việt và bóc tách thực thể địa danh (Quận, Phố).
 */

const STOP_WORDS = new Set([
  "quán",
  "quan",
  "cà phê",
  "ca phe",
  "cafe",
  "coffee",
  "tiệm",
  "tiem",
  "the",
  "nhà hàng",
  "nha hang",
  "quán ăn",
  "quan an",
  "ở",
  "o",
  "tại",
  "tai",
  "và",
  "va",
  "cùng",
  "cung",
  "hà nội",
  "ha noi",
  "hanoi",
  "ha",
  "noi",
  "việt nam",
  "viet nam",
  "viet",
  "nam",
  "vietnam",
]);

const GENERIC_SINGLE_WORDS = new Set([
  "hồ",
  "ho",
  "chill",
  "góc",
  "goc",
  "phố",
  "pho",
  "view",
  "xanh",
  "nhỏ",
  "nho",
  "xưa",
  "xua",
  "ngon",
]);

export const HANOI_DISTRICTS_KEYWORDS = [
  { key: "hoan_kiem", aliases: ["hoàn kiếm", "hoan kiem", "phố cổ", "pho co", "hồ gươm", "ho guom"] },
  { key: "ba_dinh", aliases: ["ba đình", "ba dinh", "đội cấn", "doi can", "liễu giai", "lieu giai", "giảng võ", "giang vo"] },
  { key: "tay_ho", aliases: ["tây hồ", "tay ho", "hồ tây", "ho tay", "quảng an", "quang an", "yên phụ", "yen phu", "trích sài", "trich sai", "từ hoa", "tu hoa", "nhật chiêu", "nhat chieu"] },
  { key: "dong_da", aliases: ["đống đa", "dong da", "chùa bộc", "chua boc", "xã đàn", "xa dan", "ô chợ dừa", "o cho dua", "nguyên hồng", "nguyen hong"] },
  { key: "cau_giay", aliases: ["cầu giấy", "cau giay", "trần thái tông", "tran thai tong", "duy tân", "duy tan", "tô hiệu", "to hieu"] },
  { key: "hai_ba_trung", aliases: ["hai bà trưng", "hai ba trung", "bạch mai", "bach mai", "triệu việt vương", "trieu viet vuong", "bà triệu", "ba trieu"] },
];

/**
 * Loại bỏ dấu tiếng Việt và chuẩn hóa thành chuỗi lowercase không dấu.
 */
export function removeVietnameseTones(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

/**
 * Chuẩn hóa chuỗi tìm kiếm loại bỏ stop words.
 */
export function cleanSearchTokens(str: string): string[] {
  const normalized = removeVietnameseTones(str);
  return normalized
    .split(/[\s,./_+\-–—:;!?()]+/g)
    .filter((token) => token.length > 0 && !STOP_WORDS.has(token));
}

/**
 * Trích xuất danh sách quận/khu vực được nhắc đến trong văn bản.
 */
export function extractDistricts(text: string): string[] {
  const normalized = removeVietnameseTones(text);
  const found: string[] = [];

  for (const d of HANOI_DISTRICTS_KEYWORDS) {
    for (const alias of d.aliases) {
      const aliasNorm = removeVietnameseTones(alias);
      if (normalized.includes(aliasNorm)) {
        found.push(d.key);
        break;
      }
    }
  }

  return Array.from(new Set(found));
}

/**
 * Kiểm tra xem tên địa điểm có phải là từ chung đơn độc hay không.
 */
export function isGenericSingleWord(name: string): boolean {
  const tokens = cleanSearchTokens(name);
  if (tokens.length <= 1) {
    if (tokens.length === 0) return true;
    return GENERIC_SINGLE_WORDS.has(tokens[0]);
  }
  return false;
}
