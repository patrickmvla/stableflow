import type { Database } from "@stableflow/shared";
import { createAccountHolder, createVirtualAccount } from "@stableflow/accounts";
import { createAPIKey } from "@stableflow/auth";

export async function createTestAccount(db: Database, overrides?: { name?: string; email?: string }) {
	return createAccountHolder(db, {
		name: overrides?.name ?? "Test Merchant",
		email: overrides?.email ?? `test-${Date.now()}@example.com`,
	});
}

export async function createTestVirtualAccount(
	db: Database,
	accountHolderId: string,
	overrides?: { currency?: "USD" | "EUR" | "USDC" | "USDT"; network?: string },
) {
	return createVirtualAccount(db, {
		accountHolderId,
		currency: overrides?.currency ?? "USD",
		network: overrides?.network,
	});
}

export async function createTestAPIKey(db: Database, accountHolderId: string) {
	return createAPIKey(db, { accountHolderId, name: "Test Key" });
}
