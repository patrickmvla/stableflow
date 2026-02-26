import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import {
	AccountIdSchema,
	CurrencySchema,
	PaginationSchema,
	VirtualAccountIdSchema,
	getDb,
} from "@stableflow/shared";
import {
	createAccountHolder,
	createVirtualAccount,
	getAccountHolder,
	getVirtualAccount,
	getVirtualAccountBalance,
	listAccountHolders,
	listVirtualAccounts,
} from "@stableflow/accounts";

export const accountsRouter = new OpenAPIHono();

// Schemas
const AccountHolderSchema = z.object({
	object: z.literal("account_holder"),
	id: z.string(),
	name: z.string(),
	email: z.string(),
	status: z.enum(["active", "suspended"]),
	metadata: z.record(z.unknown()),
	created_at: z.string(),
	updated_at: z.string(),
});

const VirtualAccountSchema = z.object({
	object: z.literal("virtual_account"),
	id: z.string(),
	account_holder_id: z.string(),
	currency: CurrencySchema,
	type: z.enum(["fiat", "stablecoin"]),
	network: z.string().nullable(),
	status: z.enum(["active", "frozen"]),
	created_at: z.string(),
});

const BalanceSchema = z.object({
	object: z.literal("balance"),
	virtual_account_id: z.string(),
	currency: CurrencySchema,
	amount: z.string(),
	formatted: z.string(),
});

// POST /api/v1/accounts
const createAccountRoute = createRoute({
	method: "post",
	path: "/api/v1/accounts",
	tags: ["Accounts"],
	request: {
		body: {
			content: {
				"application/json": {
					schema: z.object({
						name: z.string().min(1),
						email: z.string().email(),
						metadata: z.record(z.unknown()).optional(),
					}),
				},
			},
		},
	},
	responses: {
		201: {
			content: { "application/json": { schema: AccountHolderSchema } },
			description: "Account holder created",
		},
	},
});

accountsRouter.openapi(createAccountRoute, async (c) => {
	const body = c.req.valid("json");
	const db = getDb();
	const account = await createAccountHolder(db, body);
	return c.json(
		{
			object: "account_holder" as const,
			id: account.id,
			name: account.name,
			email: account.email,
			status: account.status,
			metadata: account.metadata as Record<string, unknown>,
			created_at: account.createdAt.toISOString(),
			updated_at: account.updatedAt.toISOString(),
		},
		201,
	);
});

// GET /api/v1/accounts
const listAccountsRoute = createRoute({
	method: "get",
	path: "/api/v1/accounts",
	tags: ["Accounts"],
	request: {
		query: PaginationSchema,
	},
	responses: {
		200: {
			content: {
				"application/json": {
					schema: z.object({
						object: z.literal("list"),
						data: z.array(AccountHolderSchema),
						pagination: z.object({
							next_cursor: z.string().nullable(),
							has_more: z.boolean(),
						}),
					}),
				},
			},
			description: "List of account holders",
		},
	},
});

accountsRouter.openapi(listAccountsRoute, async (c) => {
	const query = c.req.valid("query");
	const db = getDb();
	const result = await listAccountHolders(db, query);
	return c.json({
		object: "list" as const,
		data: result.data.map((a) => ({
			object: "account_holder" as const,
			id: a.id,
			name: a.name,
			email: a.email,
			status: a.status,
			metadata: a.metadata as Record<string, unknown>,
			created_at: a.createdAt.toISOString(),
			updated_at: a.updatedAt.toISOString(),
		})),
		pagination: result.pagination,
	});
});

// GET /api/v1/accounts/:id
const getAccountRoute = createRoute({
	method: "get",
	path: "/api/v1/accounts/{id}",
	tags: ["Accounts"],
	request: {
		params: z.object({ id: AccountIdSchema }),
	},
	responses: {
		200: {
			content: { "application/json": { schema: AccountHolderSchema } },
			description: "Account holder",
		},
	},
});

accountsRouter.openapi(getAccountRoute, async (c) => {
	const { id } = c.req.valid("param");
	const db = getDb();
	const account = await getAccountHolder(db, id);
	return c.json({
		object: "account_holder" as const,
		id: account.id,
		name: account.name,
		email: account.email,
		status: account.status,
		metadata: account.metadata as Record<string, unknown>,
		created_at: account.createdAt.toISOString(),
		updated_at: account.updatedAt.toISOString(),
	});
});

// POST /api/v1/accounts/:id/virtual-accounts
const createVirtualAccountRoute = createRoute({
	method: "post",
	path: "/api/v1/accounts/{id}/virtual-accounts",
	tags: ["Virtual Accounts"],
	request: {
		params: z.object({ id: AccountIdSchema }),
		body: {
			content: {
				"application/json": {
					schema: z.object({
						currency: CurrencySchema,
						network: z.string().optional(),
					}),
				},
			},
		},
	},
	responses: {
		201: {
			content: { "application/json": { schema: VirtualAccountSchema } },
			description: "Virtual account created",
		},
	},
});

accountsRouter.openapi(createVirtualAccountRoute, async (c) => {
	const { id } = c.req.valid("param");
	const body = c.req.valid("json");
	const db = getDb();
	const vac = await createVirtualAccount(db, {
		accountHolderId: id,
		currency: body.currency,
		network: body.network,
	});
	return c.json(
		{
			object: "virtual_account" as const,
			id: vac.id,
			account_holder_id: vac.accountHolderId,
			currency: vac.currency as "USD" | "EUR" | "USDC" | "USDT",
			type: vac.type as "fiat" | "stablecoin",
			network: vac.network,
			status: vac.status as "active" | "frozen",
			created_at: vac.createdAt.toISOString(),
		},
		201,
	);
});

// GET /api/v1/accounts/:id/virtual-accounts
const listVirtualAccountsRoute = createRoute({
	method: "get",
	path: "/api/v1/accounts/{id}/virtual-accounts",
	tags: ["Virtual Accounts"],
	request: {
		params: z.object({ id: AccountIdSchema }),
	},
	responses: {
		200: {
			content: {
				"application/json": {
					schema: z.object({
						object: z.literal("list"),
						data: z.array(VirtualAccountSchema),
					}),
				},
			},
			description: "List of virtual accounts",
		},
	},
});

accountsRouter.openapi(listVirtualAccountsRoute, async (c) => {
	const { id } = c.req.valid("param");
	const db = getDb();
	const vacs = await listVirtualAccounts(db, id);
	return c.json({
		object: "list" as const,
		data: vacs.map((vac) => ({
			object: "virtual_account" as const,
			id: vac.id,
			account_holder_id: vac.accountHolderId,
			currency: vac.currency as "USD" | "EUR" | "USDC" | "USDT",
			type: vac.type as "fiat" | "stablecoin",
			network: vac.network,
			status: vac.status as "active" | "frozen",
			created_at: vac.createdAt.toISOString(),
		})),
	});
});

// GET /api/v1/accounts/:id/virtual-accounts/:vid/balance
const getBalanceRoute = createRoute({
	method: "get",
	path: "/api/v1/accounts/{id}/virtual-accounts/{vid}/balance",
	tags: ["Virtual Accounts"],
	request: {
		params: z.object({
			id: AccountIdSchema,
			vid: VirtualAccountIdSchema,
		}),
	},
	responses: {
		200: {
			content: { "application/json": { schema: BalanceSchema } },
			description: "Virtual account balance",
		},
	},
});

accountsRouter.openapi(getBalanceRoute, async (c) => {
	const { vid } = c.req.valid("param");
	const db = getDb();
	const balance = await getVirtualAccountBalance(db, vid);
	return c.json({
		object: "balance" as const,
		virtual_account_id: vid,
		currency: balance.currency,
		amount: balance.amount.toString(),
		formatted: balance.formatted,
	});
});
