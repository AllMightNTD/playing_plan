import {
  mysqlTable,
  varchar,
  int,
  datetime,
  index,
} from "drizzle-orm/mysql-core";

export const roomUploads = mysqlTable(
  "room_uploads",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    roomId: varchar("room_id", { length: 21 }).notNull(),
    memberId: varchar("member_id", { length: 21 }).notNull(),
    memoryId: varchar("memory_id", { length: 21 }),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    mimeType: varchar("mime_type", { length: 50 }).notNull(),
    sizeBytes: int("size_bytes").notNull(),
    width: int("width"),
    height: int("height"),
    relativePath: varchar("relative_path", { length: 255 }).notNull(),
    createdAt: datetime("created_at").notNull(),
    deletedAt: datetime("deleted_at"),
  },
  (table) => [
    index("idx_room_uploads_room").on(table.roomId, table.deletedAt),
  ]
);

export type RoomUpload = typeof roomUploads.$inferSelect;
export type NewRoomUpload = typeof roomUploads.$inferInsert;
