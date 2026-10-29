/**
 * Thuật toán tính toán thời gian di chuyển nội đô Hà Nội (Section 2.13 Master Plan)
 *
 * Công thức:
 * Thời gian di chuyển (phút) = ((Khoảng cách Haversine (km) * 1.35 / Vận tốc (km/h)) * 60) + 10 phút (Buffer gửi xe)
 *
 * Vận tốc trung bình xe máy Hà Nội:
 * - Giờ cao điểm sáng (07:00 - 09:00): 15 km/h
 * - Giờ cao điểm chiều (17:00 - 19:00): 15 km/h
 * - Khung giờ bình thường: 25 km/h
 */

export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;

/**
 * Tính khoảng cách đường chim bay (Haversine formula) giữa 2 tọa độ theo km.
 */
export function calculateHaversineDistanceKm(p1: LatLng, p2: LatLng): number {
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;

  const lat1 = (p1.lat * Math.PI) / 180;
  const lat2 = (p2.lat * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

/**
 * Xác định vận tốc trung bình (km/h) tại Hà Nội dựa theo phút trong ngày (0..1439).
 */
export function getHanoiAverageSpeedKmh(minuteOfDay: number): number {
  // 07:00 (420) đến 09:00 (540)
  const isMorningRush = minuteOfDay >= 420 && minuteOfDay < 540;
  // 17:00 (1020) đến 19:00 (1140)
  const isEveningRush = minuteOfDay >= 1020 && minuteOfDay < 1140;

  if (isMorningRush || isEveningRush) {
    return 15;
  }
  return 25;
}

/**
 * Tính toán thời gian di chuyển (phút) giữa 2 điểm dừng tại Hà Nội.
 * Đã tính hệ số uốn lượn đường phố Hà Nội (1.35) và buffer tìm chỗ gửi xe (10 phút).
 */
export function calculateHanoiTravelMinutes(
  from: LatLng,
  to: LatLng,
  departureMinuteOfDay: number = 600 // Mặc định 10:00
): {
  distanceKm: number;
  travelMinutes: number;
  speedKmh: number;
  bufferMinutes: number;
} {
  const distanceKm = calculateHaversineDistanceKm(from, to);

  // Nếu cùng một điểm hoặc cách nhau dưới 50m
  if (distanceKm < 0.05) {
    return {
      distanceKm: 0,
      travelMinutes: 0,
      speedKmh: 25,
      bufferMinutes: 0,
    };
  }

  const speedKmh = getHanoiAverageSpeedKmh(departureMinuteOfDay);
  const roadDistanceKm = distanceKm * 1.35;
  const ridingMinutes = (roadDistanceKm / speedKmh) * 60;
  const bufferMinutes = 10; // 10 phút tìm chỗ gửi xe & đi bộ vào quán

  const totalMinutes = Math.round(ridingMinutes + bufferMinutes);

  return {
    distanceKm: Number(distanceKm.toFixed(2)),
    travelMinutes: Math.max(10, totalMinutes),
    speedKmh,
    bufferMinutes,
  };
}
