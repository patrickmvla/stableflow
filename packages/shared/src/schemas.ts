import { type ZodType, z } from "zod";

// ID schemas
export const AccountIdSchema = z.string().startsWith("acc_");
export const VirtualAccountIdSchema = z.string().startsWith("vac_");
export const LedgerAccountIdSchema = z.string().min(1);
export const TransactionIdSchema = z.string().startsWith("txn_");
export const EntryIdSchema = z.string().startsWith("ent_");
export const PaymentIdSchema = z.string().startsWith("pay_");
export const SettlementIdSchema = z.string().startsWith("stl_");
export const ProductIdSchema = z.string().startsWith("prd_");
export const PaymentLinkIdSchema = z.string().startsWith("lnk_");
export const ApiKeyIdSchema = z.string().startsWith("key_");
export const AuditLogIdSchema = z.string().startsWith("aud_");
export const EventIdSchema = z.string().startsWith("evt_");

// Common schemas
export const PaginationSchema = z.object({
	cursor: z.string().optional(),
	limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const CurrencySchema = z.enum(["USD", "EUR", "USDC", "USDT"]);

export const MoneySchema = z.object({
	amount: z.coerce.bigint().positive(),
	currency: CurrencySchema,
});

export const ErrorResponseSchema = z.object({
	error: z.object({
		type: z.string(),
		message: z.string(),
		details: z.record(z.unknown()).optional(),
	}),
});

export function PaginatedResponseSchema<T>(itemSchema: ZodType<T>) {
	return z.object({
		object: z.literal("list"),
		data: z.array(itemSchema),
		pagination: z.object({
			next_cursor: z.string().nullable(),
			has_more: z.boolean(),
		}),
	});
}

export type Pagination = z.infer<typeof PaginationSchema>;
export type Currency = z.infer<typeof CurrencySchema>;
