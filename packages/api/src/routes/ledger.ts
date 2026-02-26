import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getAllAccounts, godCheck } from "@stableflow/ledger";
import { CurrencySchema, formatAmount, getDb } from "@stableflow/shared";

export const ledgerRouter = new OpenAPIHono();

const LedgerAccountSchema = z.object({
	object: z.literal("ledger_account"),
	id: z.string(),
	name: z.string(),
	type: z.enum(["asset", "liability", "equity", "revenue", "expense"]),
	currency: CurrencySchema,
	balance: z.string(),
	formatted_balance: z.string(),
});

const GodCheckCurrencySchema = z.object({
	total_debits: z.string(),
	total_credits: z.string(),
	balanced: z.boolean(),
});

const GodCheckResponseSchema = z.object({
	object: z.literal("god_check"),
	balanced: z.boolean(),
	currencies: z.record(GodCheckCurrencySchema),
	checked_at: z.string(),
});

// GET /api/v1/ledger/accounts
const listLedgerAccountsRoute = createRoute({
	method: "get",
	path: "/api/v1/ledger/accounts",
	tags: ["Ledger"],
	responses: {
		200: {
			content: {
				"application/json": {
					schema: z.object({
						object: z.literal("list"),
						data: z.array(LedgerAccountSchema),
					}),
				},
			},
			description: "All ledger accounts",
		},
	},
});

ledgerRouter.openapi(listLedgerAccountsRoute, async (c) => {
	const db = getDb();
	const accounts = await getAllAccounts(db);
	return c.json({
		object: "list" as const,
		data: accounts.map((a) => ({
			object: "ledger_account" as const,
			id: a.id,
			name: a.name,
			type: a.type,
			currency: a.currency,
			balance: a.balance.toString(),
			formatted_balance: formatAmount(a.balance, a.currency),
		})),
	});
});

// GET /api/v1/ledger/god-check
const godCheckRoute = createRoute({
	method: "get",
	path: "/api/v1/ledger/god-check",
	tags: ["Ledger"],
	responses: {
		200: {
			content: { "application/json": { schema: GodCheckResponseSchema } },
			description: "God check result",
		},
	},
});

ledgerRouter.openapi(godCheckRoute, async (c) => {
	const db = getDb();
	const result = await godCheck(db);

	const currencies: Record<
		string,
		{ total_debits: string; total_credits: string; balanced: boolean }
	> = {};
	for (const [currency, data] of Object.entries(result.currencies)) {
		currencies[currency] = {
			total_debits: data.totalDebits.toString(),
			total_credits: data.totalCredits.toString(),
			balanced: data.balanced,
		};
	}

	return c.json({
		object: "god_check" as const,
		balanced: result.balanced,
		currencies,
		checked_at: new Date().toISOString(),
	});
});
