import {
  mysqlTable,
  varchar,
  datetime,
  json,
  int,
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

export const auditRateLimits = mysqlTable(
  "audit_rate_limits",
  {
    id: varchar("id", { length: 64 }).primaryKey(), // [action]:[ip]
    attemptCount: int("attempt_count").notNull().default(1),
    firstAttemptAt: datetime("first_attempt_at").notNull(),
    blockedUntil: datetime("blocked_until"),
    updatedAt: datetime("updated_at").notNull(),
  }
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
export type AuditRateLimit = typeof auditRateLimits.$inferSelect;
export type NewAuditRateLimit = typeof auditRateLimits.$inferInsert;
