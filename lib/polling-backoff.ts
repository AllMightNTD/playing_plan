export const INITIAL_POLL_INTERVAL_MS = 3000;
export const MAX_POLL_INTERVAL_MS = 12000;

/**
 * Tính toán thời gian chờ tiếp theo cho polling dựa trên mức độ hoạt động.
 * @param idlePollCount Số lần liên tiếp polling không có thay đổi (304 hoặc không có match mới)
 * @param hasUserActivity Người dùng vừa thực hiện hành động (vuốt, undo, lọc hobby)
 */
export function calculateNextPollInterval(
  idlePollCount: number,
  hasUserActivity: boolean
): number {
  if (hasUserActivity) {
    return INITIAL_POLL_INTERVAL_MS;
  }
  if (idlePollCount < 2) {
    return INITIAL_POLL_INTERVAL_MS;
  }
  const factor = Math.pow(2, idlePollCount - 1);
  return Math.min(INITIAL_POLL_INTERVAL_MS * factor, MAX_POLL_INTERVAL_MS);
}
