/**
 * Google Maps Universal URL Builder
 * Tuân thủ tiêu chuẩn Google Maps Universal Cross-Platform URLs:
 * https://developers.google.com/maps/documentation/urls/get-started
 * 
 * Đảm bảo mọi URL đều kích hoạt thẻ địa điểm POI (Place Card) có hình ảnh,
 * review sao, số điện thoại thay vì ghim tọa độ số vô danh (Dropped Pin).
 */

export interface MapLocationParams {
  name: string;
  address?: string | null;
  area?: string | null;
  lat?: number | null;
  lng?: number | null;
  placeId?: string | null;
  googleMapsUrl?: string | null;
}

/**
 * Loại bỏ các đoạn placeholder, ký tự lạ hoặc thông tin nhiễu trong tên và địa chỉ.
 */
export function cleanAddressText(address?: string | null, area?: string | null): string {
  if (!address || typeof address !== "string") {
    return area ? `${area}, Hà Nội` : "Hà Nội";
  }

  const trimmed = address.trim();
  // Nhận diện các địa chỉ generic placeholder kiểu "Hà Nội (tay_ho)", "Ba Đình, Hà Nội"
  const isGeneric = /^Hà Nội\s*\([^)]+\)$/i.test(trimmed) ||
    /^(Hoàn Kiếm|Ba Đình|Tây Hồ|Đống Đa|Cầu Giấy|Hai Bà Trưng|Thanh Xuân|Hà Đông|Nam Từ Liêm|Bắc Từ Liêm|Long Biên|Hoàng Mai|Gia Lâm|Sóc Sơn|Ba Vì),\s*Hà Nội$/i.test(trimmed);

  if (isGeneric && area) {
    return `${area}, Hà Nội`;
  }

  // Đảm bảo có hậu tố Hà Nội nếu chưa có
  if (!/Hà Nội/i.test(trimmed)) {
    return `${trimmed}, Hà Nội`;
  }

  return trimmed;
}

/**
 * Xây dựng chuỗi truy vấn tìm kiếm POI chuẩn xác trên Google Maps.
 * Kết hợp tên quán + địa chỉ cụ thể để Google Maps nhận diện chính xác POI.
 */
export function buildGoogleMapsSearchQuery(params: MapLocationParams): string {
  const cleanName = (params.name || "").trim();
  const address = cleanAddressText(params.address, params.area);

  // Nếu tên quán đã bao gồm cả địa chỉ (ví dụ: "Phố Sách Hà Nội (19/12)")
  if (address && !cleanName.toLowerCase().includes(address.toLowerCase())) {
    return `${cleanName}, ${address}`;
  }

  return cleanName.toLowerCase().includes("hà nội") ? cleanName : `${cleanName}, Hà Nội`;
}

/**
 * Xây dựng URL tìm kiếm Google Maps chính thức kích hoạt Place Card POI.
 */
export function buildGoogleMapsSearchUrl(params: MapLocationParams): string {
  // Nếu đã lưu link trực tiếp từ trước (ví dụ do admin nhập hoặc crawler lấy)
  if (params.googleMapsUrl && params.googleMapsUrl.startsWith("https://")) {
    return params.googleMapsUrl;
  }

  // Nếu đã có Google Place ID chuẩn
  if (params.placeId) {
    const encodedName = encodeURIComponent(params.name || "Địa điểm");
    return `https://www.google.com/maps/search/?api=1&query=${encodedName}&query_place_id=${encodeURIComponent(params.placeId)}`;
  }

  const query = buildGoogleMapsSearchQuery(params);
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/**
 * Xây dựng URL chỉ đường Google Maps Directions kích hoạt định vị và chỉ đường.
 */
export function buildGoogleMapsDirectionsUrl(params: MapLocationParams): string {
  const query = buildGoogleMapsSearchQuery(params);
  let url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;

  if (params.placeId) {
    url += `&destination_place_id=${encodeURIComponent(params.placeId)}`;
  }

  return url;
}

/**
 * Xây dựng URL nhúng iframe Google Maps Embed có hiển thị tên địa điểm và thẻ POI.
 */
export function buildGoogleMapsEmbedUrl(params: MapLocationParams): string {
  const query = buildGoogleMapsSearchQuery(params);
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=16&output=embed`;
}
