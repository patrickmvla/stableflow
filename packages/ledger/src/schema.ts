import { bigint, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const ledgerAccounts = pgTable(
	"ledger_accounts",
	{
		id: text("id").primaryKey(),
		name: text("name").notNull(),
		type: text("type", {
			enum: ["asset", "liability", "equity", "revenue", "expense"],
		}).notNull(),
		currency: text("currency", {
			enum: ["USD", "EUR", "USDC", "USDT"],
		}).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => [
		index("idx_ledger_accounts_type").on(t.type),
		index("idx_ledger_accounts_currency").on(t.currency),
	],
);

export const ledgerTransactions = pgTable(
	"ledger_transactions",
	{
		id: text("id").primaryKey(),
		description: text("description").notNull(),
		referenceType: text("reference_type"),
		referenceId: text("reference_id"),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => [index("idx_ledger_transactions_reference").on(t.referenceType, t.referenceId)],
);

export const ledgerEntries = pgTable(
	"ledger_entries",
	{
		id: text("id").primaryKey(),
		transactionId: text("transaction_id")
			.notNull()
			.references(() => ledgerTransactions.id),
		accountId: text("account_id")
			.notNull()
			.references(() => ledgerAccounts.id),
		direction: text("direction", { enum: ["DEBIT", "CREDIT"] }).notNull(),
		amount: bigint("amount", { mode: "bigint" }).notNull(),
		currency: text("currency", {
			enum: ["USD", "EUR", "USDC", "USDT"],
		}).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => [
		index("idx_ledger_entries_account").on(t.accountId),
		index("idx_ledger_entries_transaction").on(t.transactionId),
		index("idx_ledger_entries_currency").on(t.currency),
	],
);

export type LedgerAccount = typeof ledgerAccounts.$inferSelect;
export type LedgerTransaction = typeof ledgerTransactions.$inferSelect;
export type LedgerEntry = typeof ledgerEntries.$inferSelect;
