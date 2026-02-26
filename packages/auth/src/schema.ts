import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const apiKeys = pgTable(
	"api_keys",
	{
		id: text("id").primaryKey(),
		accountHolderId: text("account_holder_id").notNull(),
		name: text("name").notNull(),
		prefix: text("prefix").notNull(),
		keyHash: text("key_hash").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		revokedAt: timestamp("revoked_at", { withTimezone: true }),
	},
	(t) => [
		index("idx_api_keys_hash").on(t.keyHash),
		index("idx_api_keys_holder").on(t.accountHolderId),
	],
);

export const auditLogs = pgTable(
	"audit_logs",
	{
		id: text("id").primaryKey(),
		actorType: text("actor_type", { enum: ["api_key", "system"] }).notNull(),
		actorId: text("actor_id").notNull(),
		action: text("action").notNull(),
		resourceType: text("resource_type").notNull(),
		resourceId: text("resource_id").notNull(),
		metadata: jsonb("metadata"),
		ipAddress: text("ip_address"),
		userAgent: text("user_agent"),
		requestId: text("request_id"),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => [
		index("idx_audit_logs_actor").on(t.actorType, t.actorId),
		index("idx_audit_logs_resource").on(t.resourceType, t.resourceId),
		index("idx_audit_logs_action").on(t.action),
		index("idx_audit_logs_created").on(t.createdAt),
	],
);

export type APIKey = typeof apiKeys.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
