import { index, jsonb, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

export const accountHolders = pgTable(
	"account_holders",
	{
		id: text("id").primaryKey(),
		name: text("name").notNull(),
		email: text("email").notNull(),
		status: text("status", { enum: ["active", "suspended"] })
			.notNull()
			.default("active"),
		metadata: jsonb("metadata").notNull().default({}),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => [
		index("idx_account_holders_email").on(t.email),
		index("idx_account_holders_status").on(t.status),
	],
);

export const virtualAccounts = pgTable(
	"virtual_accounts",
	{
		id: text("id").primaryKey(),
		accountHolderId: text("account_holder_id")
			.notNull()
			.references(() => accountHolders.id),
		currency: text("currency", { enum: ["USD", "EUR", "USDC", "USDT"] }).notNull(),
		type: text("type", { enum: ["fiat", "stablecoin"] }).notNull(),
		network: text("network"),
		ledgerAccountId: text("ledger_account_id").notNull(),
		holdsLedgerAccountId: text("holds_ledger_account_id").notNull(),
		status: text("status", { enum: ["active", "frozen"] })
			.notNull()
			.default("active"),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => [
		index("idx_virtual_accounts_holder").on(t.accountHolderId),
		unique("uq_virtual_accounts_holder_currency_network").on(
			t.accountHolderId,
			t.currency,
			t.network,
		),
	],
);

export type AccountHolder = typeof accountHolders.$inferSelect;
export type VirtualAccount = typeof virtualAccounts.$inferSelect;
