import {
  mysqlTable,
  varchar,
  text,
  decimal,
  int,
  boolean,
  datetime,
  mysqlEnum,
  json,
  index,
  primaryKey,
} from "drizzle-orm/mysql-core";

/**
 * Bảng chặn cấm điểm rác, điểm lừa đảo hoặc mất an toàn (như Phố cà phê đường tàu).
 */
export const placeBlocklist = mysqlTable(
  "place_blocklist",
  {
    id: varchar("id", { length: 21 }).primaryKey(),
    osmId: varchar("osm_id", { length: 50 }),
    namePattern: varchar("name_pattern", { length: 255 }),
    latMin: decimal("lat_min", { precision: 9, scale: 6 }),
    latMax: decimal("lat_max", { precision: 9, scale: 6 }),
    lngMin: decimal("lng_min", { precision: 9, scale: 6 }),
    lngMax: decimal("lng_max", { precision: 9, scale: 6 }),
    reason: mysqlEnum("reason", [
      "railway_safety",
      "permanently_closed",
      "inappropriate",
      "scam",
    ]).notNull(),
    note: text("note"),
    createdAt: datetime("created_at").notNull(),
  },
  (table) => [
    index("idx_blocklist_osm_id").on(table.osmId),
    index("idx_blocklist_reason").on(table.reason),
  ]
);

/**
 * Quản trị nguồn gốc từng trường dữ liệu (Field Provenance) chống AI ảo giác.
 */
export const fieldProvenance = mysqlTable(
  "field_provenance",
  {
    id: varchar("id", { length: 21 }).primaryKey(),
    placeId: varchar("place_id", { length: 21 }).notNull(),
    fieldName: varchar("field_name", { length: 80 }).notNull(),
    source: mysqlEnum("source", [
      "editor",
      "merchant",
      "user",
      "osm",
      "youtube",
      "ai",
    ]).notNull(),
    confidence: decimal("confidence", { precision: 4, scale: 2 }).notNull().default("0.50"),
    verified: boolean("verified").notNull().default(false),
    evidenceUrl: text("evidence_url"),
    updatedAt: datetime("updated_at").notNull(),
  },
  (table) => [
    index("idx_provenance_place_field").on(table.placeId, table.fieldName),
    index("idx_provenance_source").on(table.source),
  ]
);

/**
 * Bảng Staging lưu các địa điểm thô từ OpenStreetMap (OSM) trước khi thăng hạng.
 */
export const candidatePlaces = mysqlTable(
  "candidate_places",
  {
    id: varchar("id", { length: 21 }).primaryKey(),
    osmId: varchar("osm_id", { length: 50 }).notNull().unique(),
    name: varchar("name", { length: 200 }).notNull(),
    searchName: varchar("search_name", { length: 200 }).notNull().default(""),
    lat: decimal("lat", { precision: 9, scale: 6 }).notNull(),
    lng: decimal("lng", { precision: 9, scale: 6 }).notNull(),
    address: varchar("address", { length: 300 }).notNull(),
    city: varchar("city", { length: 50 }).notNull().default("hanoi"),
    category: varchar("category", { length: 50 }).notNull().default("cafe"),
    rawTags: json("raw_tags").$type<Record<string, string>>().notNull(),
    datingScore: int("dating_score").notNull().default(0),
    evaluatedTier: mysqlEnum("evaluated_tier", ["A", "B", "C"]),
    evaluatedDateFit: mysqlEnum("evaluated_date_fit", ["romantic", "chill", "casual", "fun"]),
    batchId: varchar("batch_id", { length: 64 }),
    status: mysqlEnum("status", ["pending", "promoted", "rejected"]).notNull().default("pending"),
    createdAt: datetime("created_at").notNull(),
    updatedAt: datetime("updated_at").notNull(),
  },
  (table) => [
    index("idx_candidates_status").on(table.status),
    index("idx_candidates_dating_score").on(table.datingScore),
    index("idx_candidates_batch_id").on(table.batchId),
  ]
);

/**
 * Sổ theo dõi hạn mức gọi YouTube API Data v3 theo múi giờ Pacific Time (PT).
 */
export const youtubeQuotaLedger = mysqlTable(
  "youtube_quota_ledger",
  {
    quotaDate: varchar("quota_date", { length: 10 }).primaryKey(), // YYYY-MM-DD theo America/Los_Angeles
    unitsUsed: int("units_used").notNull().default(0),
    lastCallAt: datetime("last_call_at").notNull(),
    isHalted: boolean("is_halted").notNull().default(false),
  }
);

/**
 * Bảng liên kết M:N giữa địa điểm và video review trên YouTube.
 */
export const placeVideos = mysqlTable(
  "place_videos",
  {
    placeId: varchar("place_id", { length: 21 }).notNull(),
    videoId: varchar("video_id", { length: 50 }).notNull(),
    channelId: varchar("channel_id", { length: 50 }),
    channelTitle: varchar("channel_title", { length: 200 }),
    hasPaidPlacement: boolean("has_paid_placement").notNull().default(false),
    confidenceScore: decimal("confidence_score", { precision: 5, scale: 2 }).notNull().default("0.00"),
    status: mysqlEnum("status", [
      "auto_linked",
      "pending_review",
      "rejected",
      "verified",
    ]).notNull().default("pending_review"),
    publishedAt: datetime("published_at"),
    lastCheckedAt: datetime("last_checked_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.placeId, table.videoId] }),
    index("idx_place_videos_status").on(table.status),
    index("idx_place_videos_last_checked").on(table.lastCheckedAt),
  ]
);

/**
 * Lịch sử các đợt chạy pipeline worker tự động (Audit & Observability).
 */
export const pipelineRuns = mysqlTable(
  "pipeline_runs",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    runType: mysqlEnum("run_type", [
      "osm_ingest",
      "youtube_scrape",
      "video_match",
      "shadow_eval",
      "auto_promote",
      "maintenance",
      "video_import",
      "ai_video_hotspots",
    ]).notNull(),
    startedAt: datetime("started_at").notNull(),
    finishedAt: datetime("finished_at"),
    status: mysqlEnum("status", ["running", "success", "failed", "paused"]).notNull().default("running"),
    quotaUsed: int("quota_used").notNull().default(0),
    promotedCount: int("promoted_count").notNull().default(0),
    summaryJson: json("summary_json").$type<Record<string, unknown>>(),
  },
  (table) => [
    index("idx_pipeline_runs_type").on(table.runType),
    index("idx_pipeline_runs_status").on(table.status),
    index("idx_pipeline_runs_started").on(table.startedAt),
  ]
);

/**
 * Báo cáo thông tin sai từ người dùng cộng đồng (Community Feedback & Anti-Sabotage).
 */
export const placeReports = mysqlTable(
  "place_reports",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    placeId: varchar("place_id", { length: 36 }).notNull(),
    reason: mysqlEnum("reason", [
      "closed",
      "wrong_hours",
      "wrong_price",
      "wrong_location",
      "inappropriate",
    ]).notNull(),
    details: text("details"),
    clientHash: varchar("client_hash", { length: 64 }).notNull(),
    status: mysqlEnum("status", ["pending", "verified", "dismissed"]).notNull().default("pending"),
    createdAt: datetime("created_at").notNull(),
  },
  (table) => [
    index("idx_place_reports_place").on(table.placeId),
    index("idx_place_reports_status").on(table.status),
    index("idx_place_reports_client").on(table.clientHash),
  ]
);

/**
 * Lượt admin chấm mẫu ngẫu nhiên của pipeline (địa điểm thăng hạng, video tự liên kết).
 * Nguồn tính accuracy rolling 7 ngày cho circuit breaker.
 */
export const pipelineSampleGrades = mysqlTable(
  "pipeline_sample_grades",
  {
    id: varchar("id", { length: 21 }).primaryKey(),
    itemId: varchar("item_id", { length: 100 }).notNull(),
    itemType: mysqlEnum("item_type", ["place", "video", "hotspot"]).notNull(),
    isCorrect: boolean("is_correct").notNull(),
    feedback: text("feedback"),
    gradedBy: varchar("graded_by", { length: 255 }).notNull(),
    gradedAt: datetime("graded_at").notNull(),
  },
  (table) => [
    index("idx_sample_grades_graded_at").on(table.gradedAt),
    index("idx_sample_grades_item").on(table.itemType, table.itemId),
  ]
);

/**
 * Cờ điều khiển pipeline dùng chung giữa web admin và cron (vd: publish_paused do circuit breaker bật).
 */
export const pipelineControls = mysqlTable("pipeline_controls", {
  key: varchar("key", { length: 50 }).primaryKey(),
  isEnabled: boolean("is_enabled").notNull().default(false),
  reason: text("reason"),
  updatedBy: varchar("updated_by", { length: 255 }).notNull(),
  updatedAt: datetime("updated_at").notNull(),
});

export type PlaceBlocklist = typeof placeBlocklist.$inferSelect;
export type NewPlaceBlocklist = typeof placeBlocklist.$inferInsert;
export type FieldProvenance = typeof fieldProvenance.$inferSelect;
export type NewFieldProvenance = typeof fieldProvenance.$inferInsert;
export type CandidatePlace = typeof candidatePlaces.$inferSelect;
export type NewCandidatePlace = typeof candidatePlaces.$inferInsert;
export type YoutubeQuotaLedger = typeof youtubeQuotaLedger.$inferSelect;
export type PlaceVideo = typeof placeVideos.$inferSelect;
export type NewPlaceVideo = typeof placeVideos.$inferInsert;
export type PipelineRun = typeof pipelineRuns.$inferSelect;
export type NewPipelineRun = typeof pipelineRuns.$inferInsert;
export type PlaceReport = typeof placeReports.$inferSelect;
export type NewPlaceReport = typeof placeReports.$inferInsert;
export type PipelineSampleGrade = typeof pipelineSampleGrades.$inferSelect;
export type PipelineControl = typeof pipelineControls.$inferSelect;
