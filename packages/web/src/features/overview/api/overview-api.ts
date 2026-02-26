import type { AccountHolder, Balance, VirtualAccount } from "@/features/accounts/types";
import { apiClient } from "@/lib/api-client";
import type { ListResponse } from "@/types/api";
import type { CurrencyBalance } from "../types";

export interface OverviewStats {
	accounts: AccountHolder[];
	vacCount: number;
	balances: CurrencyBalance[];
}

export async function fetchOverviewStats(): Promise<OverviewStats> {
	const accountsRes = await apiClient<ListResponse<AccountHolder>>("/api/v1/accounts?limit=100");

	let totalVacs = 0;
	const currencyMap = new Map<string, bigint>();

	for (const account of accountsRes.data) {
		const vacsRes = await apiClient<ListResponse<VirtualAccount>>(
			`/api/v1/accounts/${account.id}/virtual-accounts`,
		);
		totalVacs += vacsRes.data.length;

		for (const vac of vacsRes.data) {
			const balanceRes = await apiClient<Balance>(
				`/api/v1/accounts/${account.id}/virtual-accounts/${vac.id}/balance`,
			);
			const current = currencyMap.get(vac.currency) ?? 0n;
			currencyMap.set(vac.currency, current + BigInt(balanceRes.amount));
		}
	}

	return {
		accounts: accountsRes.data,
		vacCount: totalVacs,
		balances: Array.from(currencyMap.entries()).map(([currency, amount]) => ({
			currency,
			rawAmount: amount,
			formatted: formatCurrency(amount, currency),
		})),
	};
}

function formatCurrency(amount: bigint, currency: string): string {
	const isFiat = currency === "USD" || currency === "EUR";
	const decimals = isFiat ? 2 : 6;
	const divisor = BigInt(10 ** decimals);
	const whole = amount / divisor;
	const frac = amount % divisor;
	const fracStr = frac.toString().padStart(decimals, "0");
	const prefix = currency === "USD" ? "$" : currency === "EUR" ? "\u20ac" : "";
	const suffix = !isFiat ? ` ${currency}` : "";
	return `${prefix}${whole.toLocaleString()}.${fracStr}${suffix}`;
}
