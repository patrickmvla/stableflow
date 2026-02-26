import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { type Database, generateId } from "@stableflow/shared";
import { apiKeys, auditLogs } from "./schema.ts";

type DrizzleDb = ReturnType<typeof drizzle>;
function d(db: Database): DrizzleDb {
	return db as DrizzleDb;
}

export interface CreateAPIKeyInput {
	accountHolderId: string;
	name: string;
}

export interface APIKeyCreateResult {
	id: string;
	name: string;
	accountHolderId: string;
	prefix: string;
	plaintext: string;
	createdAt: Date;
}

export interface APIKeyRecord {
	id: string;
	name: string;
	accountHolderId: string;
	prefix: string;
	createdAt: Date;
	revokedAt: Date | null;
}

export interface AuditLogInput {
	actorType: "api_key" | "system";
	actorId: string;
	action: string;
	resourceType: string;
	resourceId: string;
	metadata?: Record<string, unknown>;
	ipAddress?: string;
	userAgent?: string;
	requestId?: string;
}

async function hashKey(key: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(key);
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generateRawKey(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(32));
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

export async function createAPIKey(
	db: Database,
	input: CreateAPIKeyInput,
): Promise<APIKeyCreateResult> {
	const rawKey = generateRawKey();
	const prefix = "sf_live_";
	const plaintext = `${prefix}${rawKey}`;
	const keyHash = await hashKey(plaintext);

	const id = generateId("key");
	const [key] = await d(db)
		.insert(apiKeys)
		.values({
			id,
			accountHolderId: input.accountHolderId,
			name: input.name,
			prefix,
			keyHash,
		})
		.returning();

	if (!key) throw new Error("Failed to create API key");

	return {
		id: key.id,
		name: key.name,
		accountHolderId: key.accountHolderId,
		prefix: key.prefix,
		plaintext,
		createdAt: key.createdAt,
	};
}

export async function verifyAPIKey(
	db: Database,
	plaintextKey: string,
): Promise<APIKeyRecord | null> {
	const keyHash = await hashKey(plaintextKey);

	const [key] = await d(db)
		.select()
		.from(apiKeys)
		.where(eq(apiKeys.keyHash, keyHash))
		.limit(1);

	if (!key) return null;
	if (key.revokedAt !== null) return null;

	return {
		id: key.id,
		name: key.name,
		accountHolderId: key.accountHolderId,
		prefix: key.prefix,
		createdAt: key.createdAt,
		revokedAt: key.revokedAt,
	};
}

export async function revokeAPIKey(
	db: Database,
	keyId: string,
	accountHolderId: string,
): Promise<void> {
	await d(db)
		.update(apiKeys)
		.set({ revokedAt: new Date() })
		.where(
			sql`${apiKeys.id} = ${keyId} AND ${apiKeys.accountHolderId} = ${accountHolderId} AND ${apiKeys.revokedAt} IS NULL`,
		);
}

export async function listAPIKeys(
	db: Database,
	accountHolderId: string,
): Promise<APIKeyRecord[]> {
	const keys = await d(db)
		.select({
			id: apiKeys.id,
			name: apiKeys.name,
			accountHolderId: apiKeys.accountHolderId,
			prefix: apiKeys.prefix,
			createdAt: apiKeys.createdAt,
			revokedAt: apiKeys.revokedAt,
		})
		.from(apiKeys)
		.where(eq(apiKeys.accountHolderId, accountHolderId));

	return keys;
}

export async function writeAuditLog(db: Database, entry: AuditLogInput): Promise<string> {
	const id = generateId("aud");
	await d(db).insert(auditLogs).values({
		id,
		actorType: entry.actorType,
		actorId: entry.actorId,
		action: entry.action,
		resourceType: entry.resourceType,
		resourceId: entry.resourceId,
		metadata: entry.metadata ?? null,
		ipAddress: entry.ipAddress ?? null,
		userAgent: entry.userAgent ?? null,
		requestId: entry.requestId ?? null,
	});
	return id;
}
