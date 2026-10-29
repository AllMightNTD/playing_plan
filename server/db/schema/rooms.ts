import {
  mysqlTable,
  varchar,
  char,
  tinyint,
  datetime,
  date,
  mysqlEnum,
  json,
  int,
  text,
  index,
} from "drizzle-orm/mysql-core";

export const rooms = mysqlTable(
  "rooms",
  {
    id: varchar("id", { length: 21 }).primaryKey(),
    name: varchar("name", { length: 100 }),
    memberCount: tinyint("member_count").notNull().default(1),
    inviteHash: char("invite_hash", { length: 64 }),
    inviteCodeHash: char("invite_code_hash", { length: 64 }),
    inviteExpiresAt: datetime("invite_expires_at"),
    anniversaryDate: date("anniversary_date", { mode: "string" }),
    status: mysqlEnum("status", ["solo", "paired", "deleted"]).notNull().default("solo"),
    roomType: mysqlEnum("room_type", ["couple", "group"]).notNull().default("couple"),
    maxMembers: tinyint("max_members").notNull().default(2),
    storageQuotaBytes: int("storage_quota_bytes").notNull().default(26214400),
    storageUsedBytes: int("storage_used_bytes").notNull().default(0),
    photoCount: int("photo_count").notNull().default(0),
    maxPhotos: int("max_photos").notNull().default(50),
    version: int("version").notNull().default(1),
    consentVersion: varchar("consent_version", { length: 20 }),
    consentAt: datetime("consent_at"),
    pendingDeletedAt: datetime("pending_deleted_at"),
    lastActiveAt: datetime("last_active_at").notNull(),
    createdAt: datetime("created_at").notNull(),
    updatedAt: datetime("updated_at").notNull(),
  },
  (table) => [
    index("idx_rooms_invite_hash").on(table.inviteHash),
    index("idx_rooms_invite_code_hash").on(table.inviteCodeHash),
  ]
);

export const roomMembers = mysqlTable(
  "room_members",
  {
    id: varchar("id", { length: 21 }).primaryKey(),
    roomId: varchar("room_id", { length: 21 }).notNull(),
    sessionHash: char("session_hash", { length: 64 }).notNull().unique(),
    /** Khóa khôi phục riêng từng thiết bị (Silent Recovery + link sao lưu `/r/sync?k=`). */
    recoveryHash: char("recovery_hash", { length: 64 }).unique(),
    nickname: varchar("nickname", { length: 40 }),
    role: mysqlEnum("role", ["creator", "partner"]).notNull().default("creator"),
    pushSubscription: json("push_subscription"),
    lastSeenAt: datetime("last_seen_at").notNull(),
    revokedAt: datetime("revoked_at"),
    createdAt: datetime("created_at").notNull(),
  },
  (table) => [
    index("idx_room_members_room_id").on(table.roomId),
  ]
);

export type Room = typeof rooms.$inferSelect;
export type NewRoom = typeof rooms.$inferInsert;
export type RoomMember = typeof roomMembers.$inferSelect;
export type NewRoomMember = typeof roomMembers.$inferInsert;

export const roomNotices = mysqlTable(
  "room_notices",
  {
    id: varchar("id", { length: 21 }).primaryKey(),
    roomId: varchar("room_id", { length: 21 }).notNull(),
    memberId: varchar("member_id", { length: 21 }),
    noticeType: mysqlEnum("notice_type", [
      "room_delete_pending",
      "new_match",
      "plan_rsvp",
      "time_change_request",
      "secret_note_unlocked",
    ]).notNull(),
    title: varchar("title", { length: 150 }).notNull(),
    content: text("content").notNull(),
    metadata: json("metadata"),
    readAt: datetime("read_at"),
    createdAt: datetime("created_at").notNull(),
  },
  (table) => [
    index("idx_room_notices_room_read").on(table.roomId, table.readAt),
  ]
);

export type RoomNotice = typeof roomNotices.$inferSelect;
export type NewRoomNotice = typeof roomNotices.$inferInsert;

