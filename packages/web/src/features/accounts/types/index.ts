export interface AccountHolder {
	object: "account_holder";
	id: string;
	name: string;
	email: string;
	status: "active" | "suspended";
	metadata: Record<string, unknown>;
	created_at: string;
	updated_at: string;
}

export interface VirtualAccount {
	object: "virtual_account";
	id: string;
	account_holder_id: string;
	currency: "USD" | "EUR" | "USDC" | "USDT";
	type: "fiat" | "stablecoin";
	network: string | null;
	status: "active" | "frozen";
	created_at: string;
}

export interface Balance {
	object: "balance";
	virtual_account_id: string;
	currency: string;
	amount: string;
	formatted: string;
}
