import { apiClient } from "@/lib/api-client";
import type { ListResponse } from "@/types/api";
import type { AccountHolder, Balance, VirtualAccount } from "../types";

export function fetchAccounts(limit = 100) {
	return apiClient<ListResponse<AccountHolder>>(`/api/v1/accounts?limit=${limit}`);
}

export function createAccount(params: { name: string; email: string }) {
	return apiClient<AccountHolder>("/api/v1/accounts", {
		method: "POST",
		body: JSON.stringify(params),
		headers: { "Idempotency-Key": crypto.randomUUID() },
	});
}

export function fetchVirtualAccounts(accountId: string) {
	return apiClient<ListResponse<VirtualAccount>>(`/api/v1/accounts/${accountId}/virtual-accounts`);
}

export function createVirtualAccount(
	accountId: string,
	params: { currency: string; network?: string },
) {
	return apiClient<VirtualAccount>(`/api/v1/accounts/${accountId}/virtual-accounts`, {
		method: "POST",
		body: JSON.stringify(params),
		headers: { "Idempotency-Key": crypto.randomUUID() },
	});
}

export function fetchBalance(accountId: string, vacId: string) {
	return apiClient<Balance>(`/api/v1/accounts/${accountId}/virtual-accounts/${vacId}/balance`);
}
