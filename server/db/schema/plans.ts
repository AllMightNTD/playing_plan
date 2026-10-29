import {
  mysqlTable,
  varchar,
  text,
  int,
  tinyint,
  boolean,
  datetime,
  date,
  mysqlEnum,
  index,
} from "drizzle-orm/mysql-core";

export const datePlans = mysqlTable(
  "date_plans",
  {
    id: varchar("id", { length: 21 }).primaryKey(),
    roomId: varchar("room_id", { length: 21 }).notNull(),
    createdBy: varchar("created_by", { length: 21 }).notNull(),
    title: varchar("title", { length: 150 }).notNull(),
    planDate: date("plan_date", { mode: "string" }).notNull(),
    startTime: varchar("start_time", { length: 10 }).notNull(),
    status: mysqlEnum("status", ["planned", "done", "cancelled"]).notNull().default("planned"),
    budget: int("budget"),
    isSecret: boolean("is_secret").notNull().default(false),
    revealAt: datetime("reveal_at"),
    note: text("note"),
    shareToken: varchar("share_token", { length: 64 }).unique(),
    shareExpiresAt: datetime("share_expires_at"),
    version: int("version").notNull().default(1),
    createdAt: datetime("created_at").notNull(),
    updatedAt: datetime("updated_at").notNull(),
    updatedBy: varchar("updated_by", { length: 21 }),
  },
  (table) => [
    index("idx_date_plans_room_date").on(table.roomId, table.planDate),
  ]
);

export const planStops = mysqlTable(
  "plan_stops",
  {
    id: varchar("id", { length: 21 }).primaryKey(),
    planId: varchar("plan_id", { length: 21 }).notNull(),
    roomId: varchar("room_id", { length: 21 }).notNull(),
    placeId: varchar("place_id", { length: 21 }),
    customName: varchar("custom_name", { length: 150 }),
    sortOrder: int("sort_order").notNull().default(0),
    plannedTime: varchar("planned_time", { length: 10 }),
    durationMin: int("duration_min").notNull().default(60),
    dayOffset: tinyint("day_offset").notNull().default(0),
    startMinute: int("start_minute").notNull().default(0),
    travelMinutes: int("travel_minutes").notNull().default(15),
    isPinnedTime: boolean("is_pinned_time").notNull().default(false),
    note: text("note"),
  },
  (table) => [
    index("idx_plan_stops_room_id").on(table.roomId),
    index("idx_plan_stops_plan_sort").on(table.planId, table.sortOrder),
  ]
);

export const checklistItems = mysqlTable(
  "checklist_items",
  {
    id: varchar("id", { length: 21 }).primaryKey(),
    planId: varchar("plan_id", { length: 21 }).notNull(),
    content: varchar("content", { length: 200 }).notNull(),
    isDone: boolean("is_done").notNull().default(false),
    assignedTo: varchar("assigned_to", { length: 21 }),
    sortOrder: int("sort_order").notNull().default(0),
  },
  (table) => [
    index("idx_checklist_plan_sort").on(table.planId, table.sortOrder),
  ]
);

export const planRsvps = mysqlTable(
  "plan_rsvps",
  {
    id: varchar("id", { length: 21 }).primaryKey(),
    planId: varchar("plan_id", { length: 21 }).notNull(),
    roomId: varchar("room_id", { length: 21 }).notNull(),
    responderName: varchar("responder_name", { length: 60 }).notNull(),
    status: mysqlEnum("status", ["confirmed", "change_requested"]).notNull(),
    changeNote: text("change_note"),
    createdAt: datetime("created_at").notNull(),
  },
  (table) => [
    index("idx_plan_rsvps_plan").on(table.planId),
  ]
);

export type DatePlan = typeof datePlans.$inferSelect;
export type NewDatePlan = typeof datePlans.$inferInsert;
export type PlanStop = typeof planStops.$inferSelect;
export type ChecklistItem = typeof checklistItems.$inferSelect;
export type PlanRsvp = typeof planRsvps.$inferSelect;
export type NewPlanRsvp = typeof planRsvps.$inferInsert;
