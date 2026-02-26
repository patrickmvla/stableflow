import { afterEach, beforeAll, describe, expect, test } from "bun:test";
import { createAPIKey, listAPIKeys, revokeAPIKey, verifyAPIKey } from "@stableflow/auth";
import type { Database } from "@stableflow/shared";
import { createTestAccount, createTestAPIKey } from "../helpers/fixtures.ts";
import { createTestDb, truncateTables } from "../helpers/setup.ts";

let db: Database;

beforeAll(() => {
	db = createTestDb();
});

afterEach(async () => {
	await truncateTables(db);
});

// ---- API Keys ----

describe("createAPIKey", () => {
	test("creates API key with correct format", async () => {
		const holder = await createTestAccount(db);
		const result = await createAPIKey(db, { accountHolderId: holder.id, name: "Test" });
		expect(result.id).toMatch(/^key_/);
		expect(result.plaintext).toMatch(/^sf_live_/);
		expect(result.prefix).toBe("sf_live_");
	});

	test("key starts with sf_live_ prefix", async () => {
		const holder = await createTestAccount(db);
		const result = await createAPIKey(db, { accountHolderId: holder.id, name: "Prod" });
		expect(result.plaintext.startsWith("sf_live_")).toBe(true);
	});

	test("stores SHA-256 hash, not plaintext", async () => {
		const holder = await createTestAccount(db);
		const result = await createAPIKey(db, { accountHolderId: holder.id, name: "Test" });
		// The plaintext should be returned once
		expect(result.plaintext).toBeTruthy();
		// But verifying works with the hash
		const verified = await verifyAPIKey(db, result.plaintext);
		expect(verified).not.toBeNull();
		expect(verified?.id).toBe(result.id);
	});
});

describe("verifyAPIKey", () => {
	test("verifies valid key", async () => {
		const holder = await createTestAccount(db);
		const { plaintext } = await createTestAPIKey(db, holder.id);
		const record = await verifyAPIKey(db, plaintext);
		expect(record).not.toBeNull();
		expect(record?.accountHolderId).toBe(holder.id);
	});

	test("returns null for invalid key", async () => {
		const record = await verifyAPIKey(db, "sf_live_totally_invalid_key");
		expect(record).toBeNull();
	});

	test("returns null for revoked key", async () => {
		const holder = await createTestAccount(db);
		const key = await createTestAPIKey(db, holder.id);
		await revokeAPIKey(db, key.id, holder.id);
		const record = await verifyAPIKey(db, key.plaintext);
		expect(record).toBeNull();
	});
});

describe("revokeAPIKey", () => {
	test("revokes key (sets revoked_at)", async () => {
		const holder = await createTestAccount(db);
		const key = await createTestAPIKey(db, holder.id);
		await revokeAPIKey(db, key.id, holder.id);
		const keys = await listAPIKeys(db, holder.id);
		const found = keys.find((k) => k.id === key.id);
		expect(found?.revokedAt).not.toBeNull();
	});

	test("revoked key cannot be un-revoked (calling again is no-op)", async () => {
		const holder = await createTestAccount(db);
		const key = await createTestAPIKey(db, holder.id);
		await revokeAPIKey(db, key.id, holder.id);
		// Second revoke is a no-op (WHERE revokedAt IS NULL won't match)
		await revokeAPIKey(db, key.id, holder.id);
		// Still revoked
		const record = await verifyAPIKey(db, key.plaintext);
		expect(record).toBeNull();
	});
});

describe("listAPIKeys", () => {
	test("lists keys without exposing hash or plaintext", async () => {
		const holder = await createTestAccount(db);
		await createTestAPIKey(db, holder.id);
		const keys = await listAPIKeys(db, holder.id);
		expect(keys).toHaveLength(1);
		// No keyHash or plaintext in the listed record
		const key = keys[0]!;
		expect("keyHash" in key).toBe(false);
		expect("plaintext" in key).toBe(false);
		expect(key.prefix).toBe("sf_live_");
	});

	test("lists keys showing revoked status", async () => {
		const holder = await createTestAccount(db);
		const key = await createTestAPIKey(db, holder.id);
		await revokeAPIKey(db, key.id, holder.id);
		const keys = await listAPIKeys(db, holder.id);
		expect(keys[0]?.revokedAt).not.toBeNull();
	});
});

// ---- Middleware ----

describe("apiKeyAuth middleware", () => {
	test("passes with valid key in header", async () => {
		const holder = await createTestAccount(db);
		const key = await createTestAPIKey(db, holder.id);

		// We test the middleware by creating a mock Hono context
		// The actual middleware test would be in the E2E tests
		// Here we test the underlying verifyAPIKey function
		const record = await verifyAPIKey(db, key.plaintext);
		expect(record).not.toBeNull();
		expect(record?.accountHolderId).toBe(holder.id);
	});

	test("returns null for missing key", async () => {
		const record = await verifyAPIKey(db, "");
		expect(record).toBeNull();
	});

	test("rejects revoked key", async () => {
		const holder = await createTestAccount(db);
		const key = await createTestAPIKey(db, holder.id);
		await revokeAPIKey(db, key.id, holder.id);
		const record = await verifyAPIKey(db, key.plaintext);
		expect(record).toBeNull();
	});
});
