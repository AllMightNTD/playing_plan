import {
  mysqlTable,
  varchar,
  int,
  datetime,
  mysqlEnum,
  index,
  boolean,
  text,
  json,
} from "drizzle-orm/mysql-core";

export const placeCheckins = mysqlTable(
  "place_checkins",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    roomId: varchar("room_id", { length: 21 }).notNull(),
    memberId: varchar("member_id", { length: 21 }).notNull(),
    placeId: varchar("place_id", { length: 32 }).notNull(),
    placeName: varchar("place_name", { length: 255 }).notNull(),
    district: varchar("district", { length: 50 }).notNull(),
    method: mysqlEnum("method", ["gps_auto", "manual_confirm"]).notNull(),
    checkedInAt: datetime("checked_in_at").notNull(),
  },
  (table) => [
    index("idx_place_checkins_room").on(table.roomId, table.placeId),
    index("idx_place_checkins_district").on(table.roomId, table.district),
  ]
);

export const blindDateTickets = mysqlTable(
  "blind_date_tickets",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    roomId: varchar("room_id", { length: 21 }).notNull(),
    budgetTier: mysqlEnum("budget_tier", ["budget", "medium", "luxury"]).notNull().default("medium"),
    currentStep: int("current_step").notNull().default(1),
    totalSteps: int("total_steps").notNull().default(3),
    status: mysqlEnum("status", ["in_progress", "completed", "cancelled"]).notNull().default("in_progress"),
    stepsData: json("steps_data").notNull(),
    createdAt: datetime("created_at").notNull(),
    updatedAt: datetime("updated_at").notNull(),
  },
  (table) => [
    index("idx_blind_date_room_status").on(table.roomId, table.status),
  ]
);

export const secretNotes = mysqlTable(
  "secret_notes",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    roomId: varchar("room_id", { length: 21 }).notNull(),
    authorMemberId: varchar("author_member_id", { length: 21 }).notNull(),
    placeId: varchar("place_id", { length: 32 }).notNull(),
    placeName: varchar("place_name", { length: 255 }).notNull(),
    district: varchar("district", { length: 50 }).notNull(),
    hint: varchar("hint", { length: 255 }).notNull(),
    content: text("content").notNull(),
    isUnlocked: boolean("is_unlocked").notNull().default(false),
    unlockedAt: datetime("unlocked_at"),
    createdAt: datetime("created_at").notNull(),
  },
  (table) => [
    index("idx_secret_notes_room_place").on(table.roomId, table.placeId),
    index("idx_secret_notes_room_unlocked").on(table.roomId, table.isUnlocked),
  ]
);

export type PlaceCheckin = typeof placeCheckins.$inferSelect;
export type NewPlaceCheckin = typeof placeCheckins.$inferInsert;

export type BlindDateTicket = typeof blindDateTickets.$inferSelect;
export type NewBlindDateTicket = typeof blindDateTickets.$inferInsert;

export type SecretNote = typeof secretNotes.$inferSelect;
export type NewSecretNote = typeof secretNotes.$inferInsert;
