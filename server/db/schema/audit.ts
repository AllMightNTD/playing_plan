import {
  mysqlTable,
  varchar,
  datetime,
  json,
  index,
} from "drizzle-orm/mysql-core";

export const auditLogs = mysqlTable(
  "audit_logs",
  {
    id: varchar("id", { length: 21 }).primaryKey(),
    adminEmail: varchar("admin_email", { length: 150 }).notNull(),
    action: varchar("action", { length: 50 }).notNull(), // 'create', 'update', 'publish', 'delete'
    targetType: varchar("target_type", { length: 50 }).notNull(), // 'place', 'guide', 'media'
    targetId: varchar("target_id", { length: 21 }).notNull(),
    changes: json("changes"),
    createdAt: datetime("created_at").notNull(),
  },
  (table) => [
    index("idx_audit_logs_admin").on(table.adminEmail),
    index("idx_audit_logs_target").on(table.targetType, table.targetId),
  ]
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
