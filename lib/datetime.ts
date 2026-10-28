/** Việt Nam dùng UTC+7 cố định, không có giờ mùa hè. */
const VN_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;

/**
 * Đổi ngày giờ địa phương Việt Nam ("YYYY-MM-DD", "HH:mm") sang mốc UTC tuyệt đối.
 */
export function vietnamLocalToUtc(date: string, time: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hours, minutes) - VN_UTC_OFFSET_MS);
}
