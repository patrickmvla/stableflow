import { afterEach, beforeAll, describe, expect, test } from "bun:test";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { LedgerImbalanceError, ValidationError } from "@stableflow/shared";
import {
	createLedgerAccount,
	getAllAccounts,
	getBalance,
	getTransactionsByReference,
	godCheck,
	postTransaction,
} from "@stableflow/ledger";
import { createTestDb, truncateTables } from "../helpers/setup.ts";
import { verifyGodCheck } from "../helpers/god-check.ts";
import type { Database } from "@stableflow/shared";

let db: Database;
type DrizzleDb = ReturnType<typeof drizzle>;

beforeAll(() => {
	db = createTestDb();
});

afterEach(async () => {
	await truncateTables(db);
});

async function createTestLedgerAccounts(db: Database) {
	await createLedgerAccount(db, {
		id: "test:asset:USD",
		name: "Test Asset USD",
		type: "asset",
		currency: "USD",
	});
	await createLedgerAccount(db, {
		id: "test:liability:USD",
		name: "Test Liability USD",
		type: "liability",
		currency: "USD",
	});
	await createLedgerAccount(db, {
		id: "test:revenue:USD",
		name: "Test Revenue USD",
		type: "revenue",
		currency: "USD",
	});
}

// ---- Post Transaction ----

describe("postTransaction", () => {
	test("posts balanced 2-entry transaction", async () => {
		await createTestLedgerAccounts(db);
		const txn = await postTransaction(db, {
			description: "Test payment",
			entries: [
				{ accountId: "test:asset:USD", direction: "DEBIT", amount: 10000n, currency: "USD" },
				{ accountId: "test:liability:USD", direction: "CREDIT", amount: 10000n, currency: "USD" },
			],
		});
		expect(txn.id).toMatch(/^txn_/);
		expect(txn.entries).toHaveLength(2);
		await verifyGodCheck(db);
	});

	test("posts balanced 4-entry transaction", async () => {
		await createTestLedgerAccounts(db);
		const txn = await postTransaction(db, {
			description: "Complex transaction",
			entries: [
				{ accountId: "test:asset:USD", direction: "DEBIT", amount: 9750n, currency: "USD" },
				{ accountId: "test:asset:USD", direction: "DEBIT", amount: 250n, currency: "USD" },
				{ accountId: "test:liability:USD", direction: "CREDIT", amount: 9750n, currency: "USD" },
				{ accountId: "test:revenue:USD", direction: "CREDIT", amount: 250n, currency: "USD" },
			],
		});
		expect(txn.entries).toHaveLength(4);
		await verifyGodCheck(db);
	});

	test("rejects transaction with 0 entries", async () => {
		await expect(
			postTransaction(db, { description: "Empty", entries: [] }),
		).rejects.toThrow(ValidationError);
	});

	test("rejects transaction with 1 entry", async () => {
		await createTestLedgerAccounts(db);
		await expect(
			postTransaction(db, {
				description: "Single entry",
				entries: [
					{ accountId: "test:asset:USD", direction: "DEBIT", amount: 100n, currency: "USD" },
				],
			}),
		).rejects.toThrow(ValidationError);
	});

	test("rejects unbalanced transaction (debits ≠ credits)", async () => {
		await createTestLedgerAccounts(db);
		await expect(
			postTransaction(db, {
				description: "Unbalanced",
				entries: [
					{ accountId: "test:asset:USD", direction: "DEBIT", amount: 100n, currency: "USD" },
					{ accountId: "test:liability:USD", direction: "CREDIT", amount: 99n, currency: "USD" },
				],
			}),
		).rejects.toThrow(LedgerImbalanceError);
	});

	test("rejects transaction with amount <= 0", async () => {
		await createTestLedgerAccounts(db);
		await expect(
			postTransaction(db, {
				description: "Zero amount",
				entries: [
					{ accountId: "test:asset:USD", direction: "DEBIT", amount: 0n, currency: "USD" },
					{ accountId: "test:liability:USD", direction: "CREDIT", amount: 0n, currency: "USD" },
				],
			}),
		).rejects.toThrow(ValidationError);
	});

	test("rejects transaction referencing non-existent account", async () => {
		await expect(
			postTransaction(db, {
				description: "Bad account",
				entries: [
					{ accountId: "nonexistent:account", direction: "DEBIT", amount: 100n, currency: "USD" },
					{ accountId: "another:nonexistent", direction: "CREDIT", amount: 100n, currency: "USD" },
				],
			}),
		).rejects.toThrow(ValidationError);
	});

	test("rejects transaction with mismatched currency", async () => {
		await createTestLedgerAccounts(db);
		// test:asset:USD only accepts USD
		await expect(
			postTransaction(db, {
				description: "Wrong currency",
				entries: [
					{ accountId: "test:asset:USD", direction: "DEBIT", amount: 100n, currency: "EUR" },
					{ accountId: "test:liability:USD", direction: "CREDIT", amount: 100n, currency: "EUR" },
				],
			}),
		).rejects.toThrow(ValidationError);
	});

	test("sets referenceType and referenceId", async () => {
		await createTestLedgerAccounts(db);
		const txn = await postTransaction(db, {
			description: "Payment",
			referenceType: "payment",
			referenceId: "pay_test123",
			entries: [
				{ accountId: "test:asset:USD", direction: "DEBIT", amount: 100n, currency: "USD" },
				{ accountId: "test:liability:USD", direction: "CREDIT", amount: 100n, currency: "USD" },
			],
		});
		expect(txn.referenceType).toBe("payment");
		expect(txn.referenceId).toBe("pay_test123");
	});

	test("god check passes after posting", async () => {
		await createTestLedgerAccounts(db);
		await postTransaction(db, {
			description: "Balance check",
			entries: [
				{ accountId: "test:asset:USD", direction: "DEBIT", amount: 5000n, currency: "USD" },
				{ accountId: "test:liability:USD", direction: "CREDIT", amount: 5000n, currency: "USD" },
			],
		});
		await verifyGodCheck(db);
	});
});

// ---- Get Balance ----

describe("getBalance", () => {
	test("returns 0 for account with no entries", async () => {
		await createTestLedgerAccounts(db);
		const balance = await getBalance(db, "test:asset:USD");
		expect(balance.amount).toBe(0n);
	});

	test("returns correct balance for asset account (debits - credits)", async () => {
		await createTestLedgerAccounts(db);
		await postTransaction(db, {
			description: "Deposit",
			entries: [
				{ accountId: "test:asset:USD", direction: "DEBIT", amount: 10000n, currency: "USD" },
				{ accountId: "test:liability:USD", direction: "CREDIT", amount: 10000n, currency: "USD" },
			],
		});
		const balance = await getBalance(db, "test:asset:USD");
		expect(balance.amount).toBe(10000n);
		expect(balance.currency).toBe("USD");
	});

	test("returns correct balance for liability account (credits - debits)", async () => {
		await createTestLedgerAccounts(db);
		await postTransaction(db, {
			description: "Deposit",
			entries: [
				{ accountId: "test:asset:USD", direction: "DEBIT", amount: 10000n, currency: "USD" },
				{ accountId: "test:liability:USD", direction: "CREDIT", amount: 10000n, currency: "USD" },
			],
		});
		const balance = await getBalance(db, "test:liability:USD");
		expect(balance.amount).toBe(10000n);
	});

	test("returns correct balance for revenue account", async () => {
		await createTestLedgerAccounts(db);
		await postTransaction(db, {
			description: "Fee",
			entries: [
				{ accountId: "test:asset:USD", direction: "DEBIT", amount: 250n, currency: "USD" },
				{ accountId: "test:revenue:USD", direction: "CREDIT", amount: 250n, currency: "USD" },
			],
		});
		const balance = await getBalance(db, "test:revenue:USD");
		expect(balance.amount).toBe(250n);
	});

	test("returns correct balance after multiple transactions", async () => {
		await createTestLedgerAccounts(db);
		await postTransaction(db, {
			description: "First",
			entries: [
				{ accountId: "test:asset:USD", direction: "DEBIT", amount: 10000n, currency: "USD" },
				{ accountId: "test:liability:USD", direction: "CREDIT", amount: 10000n, currency: "USD" },
			],
		});
		await postTransaction(db, {
			description: "Second",
			entries: [
				{ accountId: "test:asset:USD", direction: "DEBIT", amount: 5000n, currency: "USD" },
				{ accountId: "test:liability:USD", direction: "CREDIT", amount: 5000n, currency: "USD" },
			],
		});
		const balance = await getBalance(db, "test:asset:USD");
		expect(balance.amount).toBe(15000n);
	});

	test("throws on non-existent account", async () => {
		await expect(getBalance(db, "nonexistent:account")).rejects.toThrow(ValidationError);
	});
});

// ---- Immutability ----

describe("immutability", () => {
	async function expectDbThrows(query: string): Promise<void> {
		let threw = false;
		try {
			await (db as DrizzleDb).execute(sql.raw(query));
		} catch {
			threw = true;
		}
		expect(threw).toBe(true);
	}

	test("UPDATE on ledger_transactions raises exception", async () => {
		await createTestLedgerAccounts(db);
		const txn = await postTransaction(db, {
			description: "Test",
			entries: [
				{ accountId: "test:asset:USD", direction: "DEBIT", amount: 100n, currency: "USD" },
				{ accountId: "test:liability:USD", direction: "CREDIT", amount: 100n, currency: "USD" },
			],
		});
		await expectDbThrows(
			`UPDATE ledger_transactions SET description = 'hacked' WHERE id = '${txn.id}'`,
		);
	});

	test("DELETE on ledger_transactions raises exception", async () => {
		await createTestLedgerAccounts(db);
		const txn = await postTransaction(db, {
			description: "Test",
			entries: [
				{ accountId: "test:asset:USD", direction: "DEBIT", amount: 100n, currency: "USD" },
				{ accountId: "test:liability:USD", direction: "CREDIT", amount: 100n, currency: "USD" },
			],
		});
		await expectDbThrows(`DELETE FROM ledger_transactions WHERE id = '${txn.id}'`);
	});

	test("UPDATE on ledger_entries raises exception", async () => {
		await createTestLedgerAccounts(db);
		const txn = await postTransaction(db, {
			description: "Test",
			entries: [
				{ accountId: "test:asset:USD", direction: "DEBIT", amount: 100n, currency: "USD" },
				{ accountId: "test:liability:USD", direction: "CREDIT", amount: 100n, currency: "USD" },
			],
		});
		const entryId = txn.entries[0]!.id;
		await expectDbThrows(`UPDATE ledger_entries SET amount = 999 WHERE id = '${entryId}'`);
	});

	test("DELETE on ledger_entries raises exception", async () => {
		await createTestLedgerAccounts(db);
		const txn = await postTransaction(db, {
			description: "Test",
			entries: [
				{ accountId: "test:asset:USD", direction: "DEBIT", amount: 100n, currency: "USD" },
				{ accountId: "test:liability:USD", direction: "CREDIT", amount: 100n, currency: "USD" },
			],
		});
		const entryId = txn.entries[0]!.id;
		await expectDbThrows(`DELETE FROM ledger_entries WHERE id = '${entryId}'`);
	});
});

// ---- God Check ----

describe("godCheck", () => {
	test("returns balanced=true for empty system (no entries)", async () => {
		const result = await godCheck(db);
		// Empty system has no currencies to check — balanced by definition
		expect(result.balanced).toBe(true);
	});

	test("returns balanced=true after balanced transactions", async () => {
		await createTestLedgerAccounts(db);
		await postTransaction(db, {
			description: "Test",
			entries: [
				{ accountId: "test:asset:USD", direction: "DEBIT", amount: 1000n, currency: "USD" },
				{ accountId: "test:liability:USD", direction: "CREDIT", amount: 1000n, currency: "USD" },
			],
		});
		const result = await godCheck(db);
		expect(result.balanced).toBe(true);
		expect(result.currencies["USD"]?.balanced).toBe(true);
	});

	test("per-currency check works independently", async () => {
		await createTestLedgerAccounts(db);
		await createLedgerAccount(db, { id: "test:asset:EUR", name: "Test EUR", type: "asset", currency: "EUR" });
		await createLedgerAccount(db, { id: "test:liability:EUR", name: "Test EUR Liab", type: "liability", currency: "EUR" });

		await postTransaction(db, {
			description: "USD txn",
			entries: [
				{ accountId: "test:asset:USD", direction: "DEBIT", amount: 500n, currency: "USD" },
				{ accountId: "test:liability:USD", direction: "CREDIT", amount: 500n, currency: "USD" },
			],
		});
		await postTransaction(db, {
			description: "EUR txn",
			entries: [
				{ accountId: "test:asset:EUR", direction: "DEBIT", amount: 300n, currency: "EUR" },
				{ accountId: "test:liability:EUR", direction: "CREDIT", amount: 300n, currency: "EUR" },
			],
		});

		const result = await godCheck(db);
		expect(result.currencies["USD"]?.balanced).toBe(true);
		expect(result.currencies["EUR"]?.balanced).toBe(true);
		expect(result.balanced).toBe(true);
	});
});

// ---- System Accounts ----

describe("system accounts", () => {
	test("all system accounts exist after seed", async () => {
		const accounts = await getAllAccounts(db);
		const ids = accounts.map((a) => a.id);
		expect(ids).toContain("platform:fees:USD");
		expect(ids).toContain("platform:fees:EUR");
		expect(ids).toContain("platform:fees:USDC");
		expect(ids).toContain("platform:fees:USDT");
		expect(ids).toContain("platform:cash:USD");
		expect(ids).toContain("platform:cash:USDC");
		expect(ids).toContain("platform:gas:USD");
	});

	test("system accounts have correct types and currencies", async () => {
		const accounts = await getAllAccounts(db);
		const feesUSD = accounts.find((a) => a.id === "platform:fees:USD");
		expect(feesUSD?.type).toBe("revenue");
		expect(feesUSD?.currency).toBe("USD");

		const cashUSD = accounts.find((a) => a.id === "platform:cash:USD");
		expect(cashUSD?.type).toBe("asset");

		const gasUSDC = accounts.find((a) => a.id === "platform:gas:USDC");
		expect(gasUSDC?.type).toBe("expense");
	});
});
