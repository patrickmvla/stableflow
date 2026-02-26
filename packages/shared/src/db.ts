import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

export type Database = ReturnType<typeof drizzle>;

let _db: Database | undefined;
let _client: ReturnType<typeof postgres> | undefined;

export function createDb(url: string): Database {
	const client = postgres(url);
	return drizzle(client);
}

export function getDb(): Database {
	if (!_db) {
		const url = process.env["DATABASE_URL"];
		if (!url) throw new Error("DATABASE_URL is not set");
		_client = postgres(url);
		_db = drizzle(_client);
	}
	return _db;
}

export async function closeDb(): Promise<void> {
	if (_client) {
		await _client.end();
		_client = undefined;
		_db = undefined;
	}
}
