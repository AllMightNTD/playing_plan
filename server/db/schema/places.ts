import {
  mysqlTable,
  varchar,
  text,
  decimal,
  tinyint,
  int,
  boolean,
  datetime,
  mysqlEnum,
  json,
  index,
  primaryKey,
} from "drizzle-orm/mysql-core";
import type { BestTimeSlot, OutfitGuide, PhotoSpot, Pose, SeasonNote } from "@/lib/types/catalog";

export const places = mysqlTable(
  "places",
  {
    id: varchar("id", { length: 21 }).primaryKey(),
    slug: varchar("slug", { length: 120 }).notNull().unique(),
    name: varchar("name", { length: 200 }).notNull(),
    searchName: varchar("search_name", { length: 200 }).notNull().default(""),
    searchText: text("search_text"),
    city: varchar("city", { length: 50 }).notNull().default("hanoi"),
    area: varchar("area", { length: 80 }).notNull(),
    address: varchar("address", { length: 300 }).notNull(),
    lat: decimal("lat", { precision: 9, scale: 6 }).notNull(),
    lng: decimal("lng", { precision: 9, scale: 6 }).notNull(),
    category: mysqlEnum("category", [
      "photo",
      "cafe",
      "food",
      "walk",
      "fun",
      "indoor",
      "nature",
    ]).notNull(),
    priceLevel: tinyint("price_level").notNull().default(1),
    estCostMin: int("est_cost_min").notNull().default(0),
    estCostMax: int("est_cost_max").notNull().default(0),
    moods: json("moods").$type<string[]>().notNull(),
    tags: json("tags").$type<string[]>().notNull(),
    indoor: boolean("indoor").notNull().default(false),
    coverUrl: text("cover_url").notNull(),
    summary: varchar("summary", { length: 300 }).notNull(),
    openingHours: json("opening_hours").$type<Record<string, string>>(),
    status: mysqlEnum("status", ["draft", "published", "hidden"]).notNull().default("draft"),
    viewCount: int("view_count").notNull().default(0),
    lastVerifiedAt: datetime("last_verified_at"),
    createdAt: datetime("created_at").notNull(),
    updatedAt: datetime("updated_at").notNull(),
  },
  (table) => [
    index("idx_places_city_status").on(table.city, table.status),
    index("idx_places_category").on(table.category),
    index("idx_places_price_level").on(table.priceLevel),
    index("idx_places_search_name").on(table.searchName),
  ]
);

export const placeGuides = mysqlTable("place_guides", {
  placeId: varchar("place_id", { length: 21 }).primaryKey(),
  bestTimes: json("best_times").$type<BestTimeSlot[]>(),
  bestWeekdays: json("best_weekdays").$type<number[]>(),
  avoidWeekdays: json("avoid_weekdays").$type<number[]>(),
  bestSeasons: json("best_seasons").$type<SeasonNote[]>(),
  crowdNotes: text("crowd_notes"),
  photoSpots: json("photo_spots").$type<PhotoSpot[]>(),
  poses: json("poses").$type<Pose[]>(),
  outfit: json("outfit").$type<OutfitGuide>(),
  tips: json("tips").$type<string>(),
  sourceLinks: json("source_links").$type<string[]>(),
});

export const placeMedia = mysqlTable(
  "place_media",
  {
    id: varchar("id", { length: 21 }).primaryKey(),
    placeId: varchar("place_id", { length: 21 }).notNull(),
    type: mysqlEnum("type", ["image", "video"]).notNull(),
    url: text("url").notNull(),
    platform: mysqlEnum("platform", [
      "upload",
      "tiktok",
      "youtube",
      "instagram",
      "unsplash",
      "pexels",
      "wikimedia",
    ]).notNull(),
    embedId: varchar("embed_id", { length: 100 }),
    caption: varchar("caption", { length: 200 }),
    credit: varchar("credit", { length: 200 }),
    /** Trang gốc của ảnh/video, bắt buộc để ghi nguồn theo giấy phép CC BY/BY-SA và Unsplash. */
    sourceUrl: text("source_url"),
    licenseNote: varchar("license_note", { length: 300 }),
    license: mysqlEnum("license", [
      "own",
      "cc0",
      "licensed",
      "permission",
      "embed_only",
    ]).notNull().default("permission"),
    sortOrder: int("sort_order").notNull().default(0),
  },
  (table) => [
    index("idx_place_media_place_id").on(table.placeId),
  ]
);

export const savedPlaces = mysqlTable(
  "saved_places",
  {
    memberId: varchar("member_id", { length: 21 }).notNull(),
    placeId: varchar("place_id", { length: 21 }).notNull(),
    createdAt: datetime("created_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.memberId, table.placeId] }),
  ]
);

export type Place = typeof places.$inferSelect;
export type NewPlace = typeof places.$inferInsert;
export type PlaceGuide = typeof placeGuides.$inferSelect;
export type NewPlaceGuide = typeof placeGuides.$inferInsert;
export type PlaceMedia = typeof placeMedia.$inferSelect;
