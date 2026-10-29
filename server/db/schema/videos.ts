import {
  mysqlTable,
  decimal,
  varchar,
  text,
  int,
  boolean,
  datetime,
  mysqlEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

/**
 * Video review YouTube do crawler thu thập. Thay cho file scripts/output/youtube/raw_videos.json
 * (bị gitignore nên không có trên môi trường deploy).
 */
export const videoCatalog = mysqlTable(
  "video_catalog",
  {
    videoId: varchar("video_id", { length: 50 }).primaryKey(),
    title: varchar("title", { length: 300 }).notNull(),
    description: text("description"),
    channelId: varchar("channel_id", { length: 50 }).notNull(),
    channelTitle: varchar("channel_title", { length: 200 }).notNull(),
    viewCount: int("view_count").notNull().default(0),
    likeCount: int("like_count"),
    commentCount: int("comment_count"),
    publishedAt: datetime("published_at"),
    isEmbeddable: boolean("is_embeddable").notNull().default(true),
    searchCategory: varchar("search_category", { length: 50 }),
    searchLocation: varchar("search_location", { length: 100 }),
    searchFocus: varchar("search_focus", { length: 100 }),
    durationSec: int("duration_sec"),
    // Lần cho AI xem video để tìm mốc địa điểm (null = chưa phân tích)
    aiAnalyzedAt: datetime("ai_analyzed_at"),
    aiAnalysisModel: varchar("ai_analysis_model", { length: 64 }),
    aiAnalysisError: text("ai_analysis_error"),
    importedAt: datetime("imported_at").notNull(),
    updatedAt: datetime("updated_at").notNull(),
  },
  (table) => [
    index("idx_video_catalog_channel").on(table.channelId),
    index("idx_video_catalog_published").on(table.publishedAt),
    index("idx_video_catalog_ai_analyzed").on(table.aiAnalyzedAt),
  ]
);

/**
 * Mốc thời gian trong video có xuất hiện một địa điểm. Nguồn: chapter trong mô tả video, AI xem video,
 * hoặc admin ghim tay. Người dùng chỉ thấy mốc verified; mốc tự động được kiểm toán qua mẫu chấm hằng ngày.
 */
export const videoHotspots = mysqlTable(
  "video_hotspots",
  {
    id: varchar("id", { length: 21 }).primaryKey(),
    videoId: varchar("video_id", { length: 50 }).notNull(),
    placeId: varchar("place_id", { length: 21 }).notNull(),
    timestampSec: int("timestamp_sec").notNull(),
    label: varchar("label", { length: 200 }),
    source: mysqlEnum("source", ["chapter", "admin", "ai"]).notNull(),
    // Chỉ có với mốc AI: độ tin cậy 0-1 và bằng chứng mô hình dựa vào (chữ trên màn hình / lời nói)
    confidence: decimal("confidence", { precision: 3, scale: 2 }),
    evidence: varchar("evidence", { length: 300 }),
    status: mysqlEnum("status", ["pending", "verified", "rejected"]).notNull().default("pending"),
    createdBy: varchar("created_by", { length: 255 }).notNull(),
    verifiedBy: varchar("verified_by", { length: 255 }),
    createdAt: datetime("created_at").notNull(),
    updatedAt: datetime("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("uniq_video_hotspots_video_place_ts").on(table.videoId, table.placeId, table.timestampSec),
    index("idx_video_hotspots_video_status").on(table.videoId, table.status),
    index("idx_video_hotspots_place").on(table.placeId),
  ]
);

export type VideoCatalogRow = typeof videoCatalog.$inferSelect;
export type NewVideoCatalogRow = typeof videoCatalog.$inferInsert;
export type VideoHotspotRow = typeof videoHotspots.$inferSelect;
export type NewVideoHotspotRow = typeof videoHotspots.$inferInsert;
