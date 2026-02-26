import { and, eq, gt, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import {
	AccountNotFoundError,
	ConflictError,
	ValidationError,
	type Database,
	formatAmount,
	generateId,
} from "@stableflow/shared";
import type { Currency, Pagination } from "@stableflow/shared";
import { createLedgerAccount, getBalance } from "@stableflow/ledger";
import { accountHolders, virtualAccounts } from "./schema.ts";

type DrizzleDb = ReturnType<typeof drizzle>;

export interface CreateAccountHolderInput {
	name: string;
	email: string;
	metadata?: Record<string, unknown>;
}

export interface CreateVirtualAccountInput {
	accountHolderId: string;
	currency: Currency;
	network?: string;
}

function isValidEmail(email: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function d(db: Database): DrizzleDb {
	return db as DrizzleDb;
}

export async function createAccountHolder(
	db: Database,
	input: CreateAccountHolderInput,
): Promise<typeof accountHolders.$inferSelect> {
	if (!isValidEmail(input.email)) {
		throw new ValidationError("Invalid email format");
	}

	const id = generateId("acc");
	const [account] = await d(db)
		.insert(accountHolders)
		.values({
			id,
			name: input.name,
			email: input.email,
			metadata: input.metadata ?? {},
		})
		.returning();

	if (!account) throw new Error("Failed to create account holder");
	return account;
}

export async function getAccountHolder(
	db: Database,
	id: string,
): Promise<typeof accountHolders.$inferSelect> {
	const [account] = await d(db)
		.select()
		.from(accountHolders)
		.where(eq(accountHolders.id, id))
		.limit(1);

	if (!account) throw new AccountNotFoundError(id);
	return account;
}

export async function listAccountHolders(
	db: Database,
	pagination: Pagination,
): Promise<{
	data: Array<typeof accountHolders.$inferSelect>;
	pagination: { next_cursor: string | null; has_more: boolean };
}> {
	const limit = pagination.limit + 1; // fetch one extra to check has_more

	const base = d(db).select().from(accountHolders).orderBy(accountHolders.id).limit(limit);

	const rows = pagination.cursor
		? await base.where(gt(accountHolders.id, pagination.cursor))
		: await base;

	const has_more = rows.length > pagination.limit;
	const data = has_more ? rows.slice(0, pagination.limit) : rows;
	const next_cursor = has_more ? (data[data.length - 1]?.id ?? null) : null;

	return { data, pagination: { next_cursor, has_more } };
}

export async function createVirtualAccount(
	db: Database,
	input: CreateVirtualAccountInput,
): Promise<typeof virtualAccounts.$inferSelect> {
	// Verify account holder exists and is active
	const holder = await getAccountHolder(db, input.accountHolderId);
	if (holder.status === "suspended") {
		throw new ValidationError("Cannot create virtual account for suspended account holder");
	}

	// Determine type
	const isStablecoin = input.currency === "USDC" || input.currency === "USDT";
	const type = isStablecoin ? "stablecoin" : "fiat";

	// Require network for stablecoins
	if (isStablecoin && !input.network) {
		throw new ValidationError("Network is required for stablecoin accounts");
	}

	// Check for duplicate
	const existingQuery = input.network
		? d(db)
				.select()
				.from(virtualAccounts)
				.where(
					and(
						eq(virtualAccounts.accountHolderId, input.accountHolderId),
						eq(virtualAccounts.currency, input.currency),
						eq(virtualAccounts.network, input.network),
					),
				)
				.limit(1)
		: d(db)
				.select()
				.from(virtualAccounts)
				.where(
					and(
						eq(virtualAccounts.accountHolderId, input.accountHolderId),
						eq(virtualAccounts.currency, input.currency),
						isNull(virtualAccounts.network),
					),
				)
				.limit(1);

	const existing = await existingQuery;
	if (existing.length > 0) {
		throw new ConflictError(
			`Virtual account already exists for ${input.accountHolderId} with currency ${input.currency}${input.network ? ` on ${input.network}` : ""}`,
		);
	}

	// Create ledger accounts
	const accId = input.accountHolderId;
	const currency = input.currency;
	const ledgerAccountId = `merchant:${accId}:available:${currency}`;
	const holdsLedgerAccountId = `merchant:${accId}:holds:${currency}`;

	// Create within a transaction
	const result = await d(db).transaction(async (tx) => {
		await createLedgerAccount(tx as unknown as Database, {
			id: ledgerAccountId,
			name: `Merchant ${accId} Available (${currency})`,
			type: "liability",
			currency,
		});

		await createLedgerAccount(tx as unknown as Database, {
			id: holdsLedgerAccountId,
			name: `Merchant ${accId} Holds (${currency})`,
			type: "asset",
			currency,
		});

		const id = generateId("vac");
		const [vac] = await tx
			.insert(virtualAccounts)
			.values({
				id,
				accountHolderId: input.accountHolderId,
				currency,
				type,
				network: input.network ?? null,
				ledgerAccountId,
				holdsLedgerAccountId,
			})
			.returning();

		if (!vac) throw new Error("Failed to create virtual account");
		return vac;
	});

	return result;
}

export async function getVirtualAccount(
	db: Database,
	id: string,
): Promise<typeof virtualAccounts.$inferSelect> {
	const [vac] = await d(db)
		.select()
		.from(virtualAccounts)
		.where(eq(virtualAccounts.id, id))
		.limit(1);

	if (!vac) throw new ValidationError(`Virtual account not found: ${id}`);
	return vac;
}

export async function listVirtualAccounts(
	db: Database,
	accountHolderId: string,
): Promise<Array<typeof virtualAccounts.$inferSelect>> {
	return d(db)
		.select()
		.from(virtualAccounts)
		.where(eq(virtualAccounts.accountHolderId, accountHolderId));
}

export async function getVirtualAccountBalance(
	db: Database,
	virtualAccountId: string,
): Promise<{ amount: bigint; currency: Currency; formatted: string }> {
	const vac = await getVirtualAccount(db, virtualAccountId);
	const balance = await getBalance(db, vac.ledgerAccountId);
	return {
		amount: balance.amount,
		currency: balance.currency,
		formatted: formatAmount(balance.amount, balance.currency),
	};
}
