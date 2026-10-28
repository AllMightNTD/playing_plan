import {
  mysqlTable,
  varchar,
  text,
  tinyint,
  datetime,
  mysqlEnum,
  index,
  primaryKey,
  uniqueIndex,
  int,
} from "drizzle-orm/mysql-core";

export const swipes = mysqlTable(
  "swipes",
  {
    roomId: varchar("room_id", { length: 21 }).notNull(),
    memberId: varchar("member_id", { length: 21 }).notNull(),
    placeId: varchar("place_id", { length: 21 }).notNull(),
    choice: mysqlEnum("choice", ["like", "nope"]).notNull(),
    createdAt: datetime("created_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.memberId, table.placeId] }),
    index("idx_swipes_room_place").on(table.roomId, table.placeId),
  ]
);

export const matches = mysqlTable(
  "matches",
  {
    id: varchar("id", { length: 21 }).primaryKey(),
    roomId: varchar("room_id", { length: 21 }).notNull(),
    placeId: varchar("place_id", { length: 21 }).notNull(),
    matchedAt: datetime("matched_at").notNull(),
    status: mysqlEnum("status", ["open", "planned", "dismissed"]).notNull().default("open"),
  },
  (table) => [
    uniqueIndex("uniq_matches_room_place").on(table.roomId, table.placeId),
  ]
);

export const memories = mysqlTable(
  "memories",
  {
    id: varchar("id", { length: 21 }).primaryKey(),
    planId: varchar("plan_id", { length: 21 }).notNull(),
    roomId: varchar("room_id", { length: 21 }).notNull(),
    rating: tinyint("rating").notNull().default(5),
    journal: text("journal"),
    visitedAt: datetime("visited_at").notNull(),
    createdAt: datetime("created_at").notNull(),
  },
  (table) => [
    index("idx_memories_room_id").on(table.roomId),
  ]
);

export const memoryPhotos = mysqlTable(
  "memory_photos",
  {
    id: varchar("id", { length: 21 }).primaryKey(),
    memoryId: varchar("memory_id", { length: 21 }).notNull(),
    url: text("url").notNull(),
    caption: varchar("caption", { length: 200 }),
    sortOrder: int("sort_order").notNull().default(0),
  },
  (table) => [
    index("idx_memory_photos_memory_id").on(table.memoryId),
  ]
);

export const reminders = mysqlTable(
  "reminders",
  {
    id: varchar("id", { length: 21 }).primaryKey(),
    planId: varchar("plan_id", { length: 21 }).notNull(),
    memberId: varchar("member_id", { length: 21 }).notNull(),
    remindAt: datetime("remind_at").notNull(),
    channel: mysqlEnum("channel", ["push", "calendar"]).notNull().default("calendar"),
    sentAt: datetime("sent_at"),
    createdAt: datetime("created_at").notNull(),
  },
  (table) => [
    index("idx_reminders_remind_sent").on(table.remindAt, table.sentAt),
  ]
);

export type Swipe = typeof swipes.$inferSelect;
export type Match = typeof matches.$inferSelect;
export type Memory = typeof memories.$inferSelect;
export type MemoryPhoto = typeof memoryPhotos.$inferSelect;
export type Reminder = typeof reminders.$inferSelect;
