export interface LedgerAccount {
	object: "ledger_account";
	id: string;
	name: string;
	type: "asset" | "liability" | "equity" | "revenue" | "expense";
	currency: string;
	balance: string;
	formatted_balance: string;
}

export interface GodCheckCurrency {
	total_debits: string;
	total_credits: string;
	balanced: boolean;
}

export interface GodCheckResult {
	object: "god_check";
	balanced: boolean;
	currencies: Record<string, GodCheckCurrency>;
	checked_at: string;
}
