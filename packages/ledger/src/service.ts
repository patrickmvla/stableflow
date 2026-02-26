import { eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import type { Database } from "@stableflow/shared";
import { LedgerImbalanceError, ValidationError, generateId } from "@stableflow/shared";
import type { Currency } from "@stableflow/shared";
import { ledgerAccounts, ledgerEntries, ledgerTransactions } from "./schema.ts";

type DrizzleDb = ReturnType<typeof drizzle>;

export type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";

export interface EntryInput {
	accountId: string;
	direction: "DEBIT" | "CREDIT";
	amount: bigint;
	currency: Currency;
}

export interface TransactionInput {
	description: string;
	referenceType?: string;
	referenceId?: string;
	entries: EntryInput[];
}

export interface LedgerTransactionResult {
	id: string;
	description: string;
	referenceType: string | null;
	referenceId: string | null;
	createdAt: Date;
	entries: Array<{
		id: string;
		transactionId: string;
		accountId: string;
		direction: "DEBIT" | "CREDIT";
		amount: bigint;
		currency: Currency;
		createdAt: Date;
	}>;
}

export interface GodCheckResult {
	balanced: boolean;
	currencies: {
		[currency: string]: {
			totalDebits: bigint;
			totalCredits: bigint;
			balanced: boolean;
		};
	};
}

export async function postTransaction(
	db: Database,
	input: TransactionInput,
): Promise<LedgerTransactionResult> {
	const { entries, description, referenceType, referenceId } = input;

	// Validate minimum entries
	if (entries.length < 2) {
		throw new ValidationError("Transaction must have at least 2 entries");
	}

	// Validate all amounts > 0
	for (const entry of entries) {
		if (entry.amount <= 0n) {
			throw new ValidationError("All entry amounts must be greater than 0");
		}
	}

	// Group by currency and verify balance
	const currencyTotals = new Map<Currency, { debits: bigint; credits: bigint }>();

	for (const entry of entries) {
		const totals = currencyTotals.get(entry.currency) ?? { debits: 0n, credits: 0n };
		if (entry.direction === "DEBIT") {
			totals.debits += entry.amount;
		} else {
			totals.credits += entry.amount;
		}
		currencyTotals.set(entry.currency, totals);
	}

	for (const [currency, totals] of currencyTotals) {
		if (totals.debits !== totals.credits) {
			throw new LedgerImbalanceError({
				currency,
				debits: totals.debits.toString(),
				credits: totals.credits.toString(),
			});
		}
	}

	// Verify all referenced accounts exist and currency matches
	const accountIds = [...new Set(entries.map((e) => e.accountId))];
	const foundAccounts = await (db as DrizzleDb)
		.select()
		.from(ledgerAccounts)
		.where(inArray(ledgerAccounts.id, accountIds));

	for (const entry of entries) {
		const account = foundAccounts.find((a) => a.id === entry.accountId);
		if (!account) {
			throw new ValidationError(`Ledger account not found: ${entry.accountId}`);
		}
		if (account.currency !== entry.currency) {
			throw new ValidationError(
				`Currency mismatch: account ${entry.accountId} uses ${account.currency}, entry uses ${entry.currency}`,
			);
		}
	}

	// Execute atomically
	const txnId = generateId("txn");
	const entryIds = entries.map(() => generateId("ent"));

	const result = await (db as DrizzleDb).transaction(async (tx) => {
		const [txn] = await tx
			.insert(ledgerTransactions)
			.values({
				id: txnId,
				description,
				referenceType: referenceType ?? null,
				referenceId: referenceId ?? null,
			})
			.returning();

		if (!txn) throw new Error("Failed to insert transaction");

		const insertedEntries = await tx
			.insert(ledgerEntries)
			.values(
				entries.map((entry, i) => ({
					id: entryIds[i]!,
					transactionId: txnId,
					accountId: entry.accountId,
					direction: entry.direction,
					amount: entry.amount,
					currency: entry.currency,
				})),
			)
			.returning();

		return { txn, entries: insertedEntries };
	});

	return {
		id: result.txn.id,
		description: result.txn.description,
		referenceType: result.txn.referenceType,
		referenceId: result.txn.referenceId,
		createdAt: result.txn.createdAt,
		entries: result.entries.map((e) => ({
			id: e.id,
			transactionId: e.transactionId,
			accountId: e.accountId,
			direction: e.direction as "DEBIT" | "CREDIT",
			amount: e.amount,
			currency: e.currency as Currency,
			createdAt: e.createdAt,
		})),
	};
}

export async function getBalance(
	db: Database,
	accountId: string,
): Promise<{ amount: bigint; currency: Currency }> {
	const account = await (db as DrizzleDb)
		.select()
		.from(ledgerAccounts)
		.where(eq(ledgerAccounts.id, accountId))
		.limit(1);

	if (!account[0]) {
		throw new ValidationError(`Ledger account not found: ${accountId}`);
	}

	const { type, currency } = account[0];

	const result = await (db as DrizzleDb)
		.select({
			totalDebits:
				sql<bigint>`COALESCE(SUM(CASE WHEN direction = 'DEBIT' THEN amount ELSE 0 END), 0)::bigint`,
			totalCredits:
				sql<bigint>`COALESCE(SUM(CASE WHEN direction = 'CREDIT' THEN amount ELSE 0 END), 0)::bigint`,
		})
		.from(ledgerEntries)
		.where(eq(ledgerEntries.accountId, accountId));

	const row = result[0];
	const totalDebits = BigInt(row?.totalDebits ?? 0);
	const totalCredits = BigInt(row?.totalCredits ?? 0);

	// Balance direction depends on account type
	let amount: bigint;
	if (type === "asset" || type === "expense") {
		amount = totalDebits - totalCredits;
	} else {
		// liability, revenue, equity
		amount = totalCredits - totalDebits;
	}

	return { amount, currency: currency as Currency };
}

export async function getTransactionsByReference(
	db: Database,
	referenceType: string,
	referenceId: string,
): Promise<LedgerTransactionResult[]> {
	const txns = await (db as DrizzleDb)
		.select()
		.from(ledgerTransactions)
		.where(
			sql`${ledgerTransactions.referenceType} = ${referenceType} AND ${ledgerTransactions.referenceId} = ${referenceId}`,
		);

	if (txns.length === 0) return [];

	const txnIds = txns.map((t) => t.id);
	const entries = await (db as DrizzleDb)
		.select()
		.from(ledgerEntries)
		.where(inArray(ledgerEntries.transactionId, txnIds));

	return txns.map((txn) => ({
		id: txn.id,
		description: txn.description,
		referenceType: txn.referenceType,
		referenceId: txn.referenceId,
		createdAt: txn.createdAt,
		entries: entries
			.filter((e) => e.transactionId === txn.id)
			.map((e) => ({
				id: e.id,
				transactionId: e.transactionId,
				accountId: e.accountId,
				direction: e.direction as "DEBIT" | "CREDIT",
				amount: e.amount,
				currency: e.currency as Currency,
				createdAt: e.createdAt,
			})),
	}));
}

export async function getAllAccounts(
	db: Database,
): Promise<
	Array<{ id: string; name: string; type: AccountType; currency: Currency; balance: bigint }>
> {
	const accounts = await (db as DrizzleDb).select().from(ledgerAccounts);

	const results = await Promise.all(
		accounts.map(async (account) => {
			const { amount } = await getBalance(db, account.id);
			return {
				id: account.id,
				name: account.name,
				type: account.type as AccountType,
				currency: account.currency as Currency,
				balance: amount,
			};
		}),
	);

	return results;
}

export async function godCheck(db: Database): Promise<GodCheckResult> {
	const result = await (db as DrizzleDb)
		.select({
			currency: ledgerEntries.currency,
			totalDebits:
				sql<bigint>`SUM(CASE WHEN direction = 'DEBIT' THEN amount ELSE 0 END)::bigint`,
			totalCredits:
				sql<bigint>`SUM(CASE WHEN direction = 'CREDIT' THEN amount ELSE 0 END)::bigint`,
		})
		.from(ledgerEntries)
		.groupBy(ledgerEntries.currency);

	const currencies: GodCheckResult["currencies"] = {};

	for (const row of result) {
		const totalDebits = BigInt(row.totalDebits);
		const totalCredits = BigInt(row.totalCredits);
		currencies[row.currency] = {
			totalDebits,
			totalCredits,
			balanced: totalDebits === totalCredits,
		};
	}

	const balanced = Object.values(currencies).every((c) => c.balanced);

	return { balanced, currencies };
}

export async function createLedgerAccount(
	db: Database,
	input: {
		id: string;
		name: string;
		type: AccountType;
		currency: Currency;
	},
): Promise<void> {
	await (db as DrizzleDb).insert(ledgerAccounts).values(input);
}

export async function getLedgerAccount(
	db: Database,
	id: string,
): Promise<typeof ledgerAccounts.$inferSelect | undefined> {
	const result = await (db as DrizzleDb)
		.select()
		.from(ledgerAccounts)
		.where(eq(ledgerAccounts.id, id))
		.limit(1);
	return result[0];
}
