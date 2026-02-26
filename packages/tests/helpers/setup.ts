import type { Database } from "@stableflow/shared";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const DATABASE_URL = process.env["DATABASE_URL"]!;

export function createTestDb(): Database {
	const client = postgres(DATABASE_URL);
	return drizzle(client) as unknown as Database;
}

// TRUNCATE bypasses row-level immutability triggers (FOR EACH ROW).
// Order matters for FK constraints — most dependent tables first.
const TRUNCATE_ORDER = [
	"ledger_entries",
	"ledger_transactions",
	"virtual_accounts",
	"api_keys",
	"audit_logs",
	"account_holders",
	"ledger_accounts",
];

const SYSTEM_ACCOUNTS_SQL = `
INSERT INTO ledger_accounts (id, name, type, currency) VALUES
  ('platform:fees:USD',  'Platform Fees (USD)',  'revenue',  'USD'),
  ('platform:fees:EUR',  'Platform Fees (EUR)',  'revenue',  'EUR'),
  ('platform:fees:USDC', 'Platform Fees (USDC)', 'revenue',  'USDC'),
  ('platform:fees:USDT', 'Platform Fees (USDT)', 'revenue',  'USDT'),
  ('platform:cash:USD',  'Platform Cash (USD)',  'asset',    'USD'),
  ('platform:cash:EUR',  'Platform Cash (EUR)',  'asset',    'EUR'),
  ('platform:cash:USDC', 'Platform Cash (USDC)', 'asset',    'USDC'),
  ('platform:cash:USDT', 'Platform Cash (USDT)', 'asset',    'USDT'),
  ('platform:gas:USD',   'Platform Gas Fees (USD)',  'expense', 'USD'),
  ('platform:gas:USDC',  'Platform Gas Fees (USDC)', 'expense', 'USDC'),
  ('platform:gas:USDT',  'Platform Gas Fees (USDT)', 'expense', 'USDT')
ON CONFLICT (id) DO NOTHING
`;

export async function truncateTables(db: Database): Promise<void> {
	const rawDb = db as ReturnType<typeof drizzle>;
	// TRUNCATE bypasses row-level triggers; CASCADE handles FK constraints
	const tables = TRUNCATE_ORDER.map((t) => `"${t}"`).join(", ");

	// Retry on deadlock (code 40P01) — can occur when concurrent pool connections
	// race between TRUNCATE and lingering queries from Promise.all patterns
	for (let attempt = 1; attempt <= 3; attempt++) {
		try {
			await rawDb.execute(sql.raw(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`));
			break;
		} catch (err: unknown) {
			const isDeadlock =
				(err as any)?.cause?.code === "40P01" || String((err as any)?.message).includes("deadlock");
			if (isDeadlock && attempt < 3) {
				await new Promise((resolve) => setTimeout(resolve, 100 * attempt));
				continue;
			}
			throw err;
		}
	}

	// Re-seed system accounts
	await rawDb.execute(sql.raw(SYSTEM_ACCOUNTS_SQL));
}
