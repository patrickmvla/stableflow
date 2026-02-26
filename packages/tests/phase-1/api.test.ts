import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import type { Database } from "@stableflow/shared";
import { createTestAccount, createTestAPIKey } from "../helpers/fixtures.ts";
import { createTestDb, truncateTables } from "../helpers/setup.ts";

// We import the app after setting up env vars
let db: Database;
let apiUrl: string;
let server: ReturnType<typeof Bun.serve> | null = null;

beforeAll(async () => {
	// Ensure env is set for API server
	process.env["DATABASE_URL"] = process.env["DATABASE_URL"]!;
	process.env["API_KEY_SALT"] = process.env["API_KEY_SALT"] ?? "test-salt";
	process.env["NODE_ENV"] = "test";

	db = createTestDb();

	// Import and start the app
	const { app } = await import("@stableflow/api");
	server = Bun.serve({
		port: 0, // random port
		fetch: app.fetch,
	});
	apiUrl = `http://localhost:${server.port}`;
});

afterAll(async () => {
	server?.stop();
});

afterEach(async () => {
	await truncateTables(db);
});

async function makeRequest(
	path: string,
	options?: {
		method?: string;
		body?: unknown;
		apiKey?: string;
	},
) {
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
	};
	if (options?.apiKey) {
		headers["Authorization"] = `Bearer ${options.apiKey}`;
	}

	return fetch(`${apiUrl}${path}`, {
		method: options?.method ?? "GET",
		headers,
		body: options?.body ? JSON.stringify(options.body) : undefined,
	});
}

// ---- Health ----

describe("GET /health", () => {
	test("returns 200 with status ok", async () => {
		const res = await makeRequest("/health");
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.status).toBe("ok");
		expect(body.version).toBe("1.0.0");
		expect(body.timestamp).toBeTruthy();
	});
});

// ---- Accounts API ----

describe("POST /api/v1/accounts", () => {
	test("requires authentication", async () => {
		const res = await makeRequest("/api/v1/accounts", {
			method: "POST",
			body: { name: "Test", email: "test@example.com" },
		});
		expect(res.status).toBe(401);
	});

	test("creates account holder with valid API key", async () => {
		// Bootstrap: create an account + API key directly via service
		const bootstrapAccount = await createTestAccount(db);
		const bootstrapKey = await createTestAPIKey(db, bootstrapAccount.id);

		const res = await makeRequest("/api/v1/accounts", {
			method: "POST",
			apiKey: bootstrapKey.plaintext,
			body: { name: "Acme Corp", email: "billing@acme.com" },
		});
		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body.object).toBe("account_holder");
		expect(body.id).toMatch(/^acc_/);
		expect(body.name).toBe("Acme Corp");
	});
});

describe("GET /api/v1/accounts", () => {
	test("lists account holders", async () => {
		const account = await createTestAccount(db);
		const key = await createTestAPIKey(db, account.id);

		const res = await makeRequest("/api/v1/accounts", { apiKey: key.plaintext });
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.object).toBe("list");
		expect(Array.isArray(body.data)).toBe(true);
	});
});

describe("POST /api/v1/accounts/:id/virtual-accounts", () => {
	test("creates virtual account", async () => {
		const account = await createTestAccount(db);
		const key = await createTestAPIKey(db, account.id);

		const res = await makeRequest(`/api/v1/accounts/${account.id}/virtual-accounts`, {
			method: "POST",
			apiKey: key.plaintext,
			body: { currency: "USD" },
		});
		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body.object).toBe("virtual_account");
		expect(body.currency).toBe("USD");
		expect(body.type).toBe("fiat");
	});
});

describe("GET /api/v1/accounts/:id/virtual-accounts/:vid/balance", () => {
	test("returns balance for virtual account", async () => {
		const account = await createTestAccount(db);
		const key = await createTestAPIKey(db, account.id);

		// Create virtual account
		const createRes = await makeRequest(`/api/v1/accounts/${account.id}/virtual-accounts`, {
			method: "POST",
			apiKey: key.plaintext,
			body: { currency: "USD" },
		});
		const vacBody = await createRes.json();
		const vacId = vacBody.id;

		const res = await makeRequest(
			`/api/v1/accounts/${account.id}/virtual-accounts/${vacId}/balance`,
			{ apiKey: key.plaintext },
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.object).toBe("balance");
		expect(body.amount).toBe("0");
		expect(body.currency).toBe("USD");
		expect(body.formatted).toBe("$0.00");
	});
});

// ---- Ledger API ----

describe("GET /api/v1/ledger/accounts", () => {
	test("returns all ledger accounts", async () => {
		const account = await createTestAccount(db);
		const key = await createTestAPIKey(db, account.id);

		const res = await makeRequest("/api/v1/ledger/accounts", { apiKey: key.plaintext });
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.object).toBe("list");
		expect(body.data.some((a: { id: string }) => a.id === "platform:fees:USD")).toBe(true);
	});
});

describe("GET /api/v1/ledger/god-check", () => {
	test("returns balanced result", async () => {
		const account = await createTestAccount(db);
		const key = await createTestAPIKey(db, account.id);

		const res = await makeRequest("/api/v1/ledger/god-check", { apiKey: key.plaintext });
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.object).toBe("god_check");
		expect(body.balanced).toBe(true);
		expect(body.checked_at).toBeTruthy();
	});
});

// ---- API Keys API ----

describe("POST /api/v1/api-keys", () => {
	test("creates key and returns plaintext", async () => {
		const account = await createTestAccount(db);
		const key = await createTestAPIKey(db, account.id);

		const res = await makeRequest("/api/v1/api-keys", {
			method: "POST",
			apiKey: key.plaintext,
			body: { name: "New Key" },
		});
		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body.object).toBe("api_key");
		expect(body.plaintext).toMatch(/^sf_live_/);
	});
});

describe("GET /api/v1/api-keys", () => {
	test("lists keys", async () => {
		const account = await createTestAccount(db);
		const key = await createTestAPIKey(db, account.id);

		const res = await makeRequest("/api/v1/api-keys", { apiKey: key.plaintext });
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.object).toBe("list");
		expect(body.data.length).toBeGreaterThanOrEqual(1);
	});
});

describe("POST /api/v1/api-keys/:id/revoke", () => {
	test("revokes key", async () => {
		const account = await createTestAccount(db);
		const key = await createTestAPIKey(db, account.id);
		// Create a second key to use for the revoke request
		const key2 = await createTestAPIKey(db, account.id);

		const res = await makeRequest(`/api/v1/api-keys/${key.id}/revoke`, {
			method: "POST",
			apiKey: key2.plaintext,
		});
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.revoked_at).toBeTruthy();
	});
});
