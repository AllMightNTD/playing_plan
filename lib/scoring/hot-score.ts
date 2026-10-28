/**
 * Công thức tính HotScore chuẩn hóa kết hợp giữa độ lan tỏa trên YouTube (có phân rã thời gian)
 * và mức độ tương tác nội bộ ứng dụng DateMate.
 */

export interface HotScoreInput {
  videoViews: number;
  videoPublishedAt?: Date | string | null;
  appLikes?: number;
  now?: Date;
}

export interface HotScoreResult {
  hotScore: number;
  videoHotness: number;
  appEngagement: number;
  decayFactor: number;
  daysOld: number;
}

// Hằng số phân rã thời gian: chu kỳ bán rã (half-life) = 180 ngày (~6 tháng)
// lambda = ln(2) / 180 ≈ 0.00385
const DECAY_LAMBDA = Math.LN2 / 180;
const MAX_VIDEO_VIEWS_CEILING = 1_000_000;
const MAX_APP_LIKES_CEILING = 500;

/**
 * Tính toán VideoHotness:
 * VideoHotness = min(views / 10^6, 1) * 100 * exp(-lambda * deltaT)
 */
export function calculateVideoHotness(
  views: number,
  publishedAt?: Date | string | null,
  now: Date = new Date()
): { videoHotness: number; decayFactor: number; daysOld: number } {
  if (views <= 0) {
    return { videoHotness: 0, decayFactor: 1, daysOld: 0 };
  }

  const pubDate = publishedAt ? new Date(publishedAt) : now;
  const diffMs = Math.max(0, now.getTime() - pubDate.getTime());
  const daysOld = diffMs / (1000 * 60 * 60 * 24);

  // Hệ số phân rã theo hàm mũ tự nhiên
  const decayFactor = Math.exp(-DECAY_LAMBDA * daysOld);

  // Chuẩn hóa lượt xem về thang 0-100
  const normalizedViews = Math.min(views / MAX_VIDEO_VIEWS_CEILING, 1) * 100;
  const videoHotness = normalizedViews * decayFactor;

  return {
    videoHotness: Math.round(videoHotness * 100) / 100,
    decayFactor: Math.round(decayFactor * 1000) / 1000,
    daysOld: Math.round(daysOld),
  };
}

/**
 * Tính toán AppEngagement (lượt like/tương tác trong app không bị phân rã theo tuổi video):
 * AppEngagement = min(appLikes / 500, 1) * 100
 */
export function calculateAppEngagement(likes = 0): number {
  if (likes <= 0) return 0;
  const engagement = Math.min(likes / MAX_APP_LIKES_CEILING, 1) * 100;
  return Math.round(engagement * 100) / 100;
}

/**
 * Tính toán HotScore tổng hợp:
 * HotScore = 0.5 * VideoHotness + 0.5 * AppEngagement
 * Luôn nằm trong khoảng [0, 100]
 */
export function calculateHotScore(input: HotScoreInput): HotScoreResult {
  const now = input.now ?? new Date();
  const { videoHotness, decayFactor, daysOld } = calculateVideoHotness(
    input.videoViews,
    input.videoPublishedAt,
    now
  );
  const appEngagement = calculateAppEngagement(input.appLikes ?? 0);

  const rawHotScore = 0.5 * videoHotness + 0.5 * appEngagement;
  const clampedHotScore = Math.max(0, Math.min(100, Math.round(rawHotScore * 100) / 100));

  return {
    hotScore: clampedHotScore,
    videoHotness,
    appEngagement,
    decayFactor,
    daysOld,
  };
}
