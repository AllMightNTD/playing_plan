import { normalizeVietnamese } from "./search.ts";
import { calculateHaversineDistanceKm } from "./travel-time.ts";

/** 7 quận nội thành dùng cho Bản đồ cào và check-in (key lưu ở place_checkins.district). */
/**
 * `center` là tâm gần đúng của quận (dùng đoán quận từ tọa độ); `grid` là ô [cột, hàng] trên bản đồ cào 3x3,
 * xếp theo vị trí địa lý tương đối (Bắc ở trên).
 */
export const HANOI_7_DISTRICTS = [
  { key: "tay_ho", name: "Tây Hồ", center: { lat: 21.07, lng: 105.818 }, grid: [2, 1] },
  { key: "hoan_kiem", name: "Hoàn Kiếm", center: { lat: 21.0287, lng: 105.852 }, grid: [3, 2] },
  { key: "ba_dinh", name: "Ba Đình", center: { lat: 21.034, lng: 105.814 }, grid: [2, 2] },
  { key: "dong_da", name: "Đống Đa", center: { lat: 21.013, lng: 105.827 }, grid: [2, 3] },
  { key: "thanh_xuan", name: "Thanh Xuân", center: { lat: 20.993, lng: 105.811 }, grid: [1, 3] },
  { key: "hai_ba_trung", name: "Hai Bà Trưng", center: { lat: 21.006, lng: 105.857 }, grid: [3, 3] },
  { key: "cau_giay", name: "Cầu Giấy", center: { lat: 21.031, lng: 105.79 }, grid: [1, 2] },
] as const;

/** Xa tâm quận gần nhất quá ngưỡng này thì coi như ngoài 7 quận nội thành. */
const MAX_DISTRICT_DISTANCE_KM = 4;

/** Địa điểm ngoài 7 quận vẫn check-in được, chỉ không cào ô nào trên bản đồ. */
export const OTHER_DISTRICT_KEY = "khac";

/** Suy ra quận từ trường `area` tự do của địa điểm (vd: "Quận Tây Hồ, Hà Nội", "Hoàn Kiếm - Long Biên"). */
export function resolveDistrictKey(area: string | null | undefined): string {
  const normalizedArea = normalizeVietnamese(area ?? "");
  const match = HANOI_7_DISTRICTS.find((d) => normalizedArea.includes(normalizeVietnamese(d.name)));
  return match?.key ?? OTHER_DISTRICT_KEY;
}

/** Đoán quận từ tọa độ theo tâm quận gần nhất; ngoài nội thành trả về khác. Chỉ là ước lượng. */
export function nearestDistrictKey(point: { lat: number; lng: number }): string {
  let best: { key: string; km: number } | null = null;
  for (const d of HANOI_7_DISTRICTS) {
    const km = calculateHaversineDistanceKm(point, d.center);
    if (!best || km < best.km) best = { key: d.key, km };
  }
  return best && best.km <= MAX_DISTRICT_DISTANCE_KM ? best.key : OTHER_DISTRICT_KEY;
}

export function districtName(key: string): string {
  return HANOI_7_DISTRICTS.find((d) => d.key === key)?.name ?? "Khu vực khác";
}
