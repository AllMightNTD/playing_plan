import { isDatabaseConfigured } from "@/server/db/client";
import { AppError, ERRORS } from "@/server/http/errors";
import { drizzleRoomRepository } from "@/server/db/queries/user/rooms.queries";
import { drizzlePlanRepository } from "@/server/db/queries/user/plans.queries";
import { drizzleSwipeRepository } from "@/server/db/queries/user/swipes.queries";
import { drizzleSavedPlaceRepository } from "@/server/db/queries/user/saved.queries";
import { drizzleMemoryRepository } from "@/server/db/queries/user/memories.queries";
import { drizzleUploadRepository } from "@/server/db/queries/user/uploads.queries";
import { drizzleRoomNoticeRepository } from "@/server/db/queries/user/notices.queries";
import { drizzleGamificationRepository } from "@/server/db/queries/user/gamification.queries";
import { memoryRoomRepository } from "@/server/db/demo/rooms.memory";
import { memoryPlanRepository } from "@/server/db/demo/plans.memory";
import { memorySavedPlaceRepository, memorySwipeRepository } from "@/server/db/demo/interactions.memory";
import { memoryMemoryRepository } from "@/server/db/demo/memories.memory";
import { memoryUploadRepository } from "@/server/db/demo/uploads.memory";
import { memoryRoomNoticeRepository } from "@/server/db/demo/notices.memory";
import { memoryGamificationRepository } from "@/server/db/demo/gamification.memory";
import type { UserRepositories } from "@/server/db/repositories/types";

const drizzleRepositories: UserRepositories = {
  rooms: drizzleRoomRepository,
  plans: drizzlePlanRepository,
  swipes: drizzleSwipeRepository,
  saved: drizzleSavedPlaceRepository,
  memories: drizzleMemoryRepository,
  uploads: drizzleUploadRepository,
  notices: drizzleRoomNoticeRepository,
  gamification: drizzleGamificationRepository,
};

const memoryRepositories: UserRepositories = {
  rooms: memoryRoomRepository,
  plans: memoryPlanRepository,
  swipes: memorySwipeRepository,
  saved: memorySavedPlaceRepository,
  memories: memoryMemoryRepository,
  uploads: memoryUploadRepository,
  notices: memoryRoomNoticeRepository,
  gamification: memoryGamificationRepository,
};

/**
 * Có DATABASE_URL thì dùng TiDB; thiếu thì dùng store in-memory cho dev/demo.
 * Production thiếu cấu hình thì trả 503, không bao giờ rơi về store in-memory dùng chung.
 */
export function getUserRepositories(): UserRepositories {
  if (isDatabaseConfigured()) return drizzleRepositories;
  if (process.env.NODE_ENV === "production") throw new AppError(ERRORS.COMMON.DB_NOT_CONFIGURED);
  return memoryRepositories;
}
