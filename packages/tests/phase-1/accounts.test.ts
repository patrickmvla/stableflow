import { afterEach, beforeAll, describe, expect, test } from "bun:test";
import {
	createAccountHolder,
	createVirtualAccount,
	getAccountHolder,
	getVirtualAccount,
	getVirtualAccountBalance,
	listAccountHolders,
	listVirtualAccounts,
} from "@stableflow/accounts";
import type { Database } from "@stableflow/shared";
import { AccountNotFoundError, ConflictError, ValidationError } from "@stableflow/shared";
import { createTestAccount } from "../helpers/fixtures.ts";
import { verifyGodCheck } from "../helpers/god-check.ts";
import { createTestDb, truncateTables } from "../helpers/setup.ts";

let db: Database;

beforeAll(() => {
	db = createTestDb();
});

afterEach(async () => {
	await truncateTables(db);
});

// ---- Account Holders ----

describe("createAccountHolder", () => {
	test("creates account holder with valid input", async () => {
		const account = await createAccountHolder(db, {
			name: "Acme Corp",
			email: "billing@acme.com",
		});
		expect(account.name).toBe("Acme Corp");
		expect(account.email).toBe("billing@acme.com");
		expect(account.status).toBe("active");
	});

	test("generates acc_ prefixed ID", async () => {
		const account = await createTestAccount(db);
		expect(account.id).toMatch(/^acc_/);
	});

	test("rejects invalid email", async () => {
		await expect(createAccountHolder(db, { name: "Bad", email: "not-an-email" })).rejects.toThrow(
			ValidationError,
		);
	});

	test("stores metadata", async () => {
		const account = await createAccountHolder(db, {
			name: "Test",
			email: "test@example.com",
			metadata: { industry: "ecommerce" },
		});
		expect((account.metadata as Record<string, unknown>)["industry"]).toBe("ecommerce");
	});
});

describe("getAccountHolder", () => {
	test("gets account holder by ID", async () => {
		const created = await createTestAccount(db);
		const found = await getAccountHolder(db, created.id);
		expect(found.id).toBe(created.id);
	});

	test("throws AccountNotFoundError for invalid ID", async () => {
		await expect(getAccountHolder(db, "acc_nonexistent")).rejects.toThrow(AccountNotFoundError);
	});
});

describe("listAccountHolders", () => {
	test("lists account holders with pagination", async () => {
		await createTestAccount(db, { email: "a@test.com" });
		await createTestAccount(db, { email: "b@test.com" });
		const result = await listAccountHolders(db, { limit: 10 });
		expect(result.data.length).toBeGreaterThanOrEqual(2);
		expect(result.pagination.has_more).toBe(false);
	});

	test("cursor pagination works", async () => {
		const a1 = await createTestAccount(db, { email: "p1@test.com" });
		const a2 = await createTestAccount(db, { email: "p2@test.com" });
		const a3 = await createTestAccount(db, { email: "p3@test.com" });

		const first = await listAccountHolders(db, { limit: 2 });
		expect(first.data).toHaveLength(2);
		expect(first.pagination.has_more).toBe(true);

		const second = await listAccountHolders(db, {
			limit: 2,
			cursor: first.pagination.next_cursor!,
		});
		expect(second.data.length).toBeGreaterThanOrEqual(1);
	});
});

// ---- Virtual Accounts ----

describe("createVirtualAccount", () => {
	test("creates fiat virtual account (USD)", async () => {
		const holder = await createTestAccount(db);
		const vac = await createVirtualAccount(db, {
			accountHolderId: holder.id,
			currency: "USD",
		});
		expect(vac.id).toMatch(/^vac_/);
		expect(vac.currency).toBe("USD");
		expect(vac.type).toBe("fiat");
		expect(vac.network).toBeNull();
	});

	test("creates stablecoin virtual account (USDC on Polygon)", async () => {
		const holder = await createTestAccount(db);
		const vac = await createVirtualAccount(db, {
			accountHolderId: holder.id,
			currency: "USDC",
			network: "polygon",
		});
		expect(vac.type).toBe("stablecoin");
		expect(vac.network).toBe("polygon");
	});

	test("creates corresponding ledger accounts", async () => {
		const holder = await createTestAccount(db);
		const vac = await createVirtualAccount(db, {
			accountHolderId: holder.id,
			currency: "USD",
		});
		expect(vac.ledgerAccountId).toBe(`merchant:${holder.id}:available:USD`);
		expect(vac.holdsLedgerAccountId).toBe(`merchant:${holder.id}:holds:USD`);
	});

	test("rejects duplicate (same holder + currency + network)", async () => {
		const holder = await createTestAccount(db);
		await createVirtualAccount(db, { accountHolderId: holder.id, currency: "USD" });
		await expect(
			createVirtualAccount(db, { accountHolderId: holder.id, currency: "USD" }),
		).rejects.toThrow(ConflictError);
	});

	test("rejects stablecoin without network", async () => {
		const holder = await createTestAccount(db);
		await expect(
			createVirtualAccount(db, { accountHolderId: holder.id, currency: "USDC" }),
		).rejects.toThrow(ValidationError);
	});

	test("rejects for non-existent account holder", async () => {
		await expect(
			createVirtualAccount(db, { accountHolderId: "acc_nonexistent", currency: "USD" }),
		).rejects.toThrow();
	});
});

describe("listVirtualAccounts", () => {
	test("lists virtual accounts for holder", async () => {
		const holder = await createTestAccount(db);
		await createVirtualAccount(db, { accountHolderId: holder.id, currency: "USD" });
		await createVirtualAccount(db, { accountHolderId: holder.id, currency: "EUR" });
		const vacs = await listVirtualAccounts(db, holder.id);
		expect(vacs).toHaveLength(2);
	});
});

describe("getVirtualAccountBalance", () => {
	test("balance is 0 for new account", async () => {
		const holder = await createTestAccount(db);
		const vac = await createVirtualAccount(db, { accountHolderId: holder.id, currency: "USD" });
		const balance = await getVirtualAccountBalance(db, vac.id);
		expect(balance.amount).toBe(0n);
		expect(balance.currency).toBe("USD");
		expect(balance.formatted).toBe("$0.00");
	});

	test("balance reflects ledger entries", async () => {
		const holder = await createTestAccount(db);
		const vac = await createVirtualAccount(db, { accountHolderId: holder.id, currency: "USD" });

		// Post a transaction to credit the merchant's available account
		const { postTransaction } = await import("@stableflow/ledger");
		await postTransaction(db, {
			description: "Test credit",
			entries: [
				{ accountId: "platform:cash:USD", direction: "DEBIT", amount: 10000n, currency: "USD" },
				{ accountId: vac.ledgerAccountId, direction: "CREDIT", amount: 10000n, currency: "USD" },
			],
		});

		const balance = await getVirtualAccountBalance(db, vac.id);
		expect(balance.amount).toBe(10000n);
		expect(balance.formatted).toBe("$100.00");

		await verifyGodCheck(db);
	});
});
