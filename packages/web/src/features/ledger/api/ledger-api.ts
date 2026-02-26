import { apiClient } from "@/lib/api-client";
import type { ListResponse } from "@/types/api";
import type { GodCheckResult, LedgerAccount } from "../types";

export function fetchLedgerAccounts() {
	return apiClient<ListResponse<LedgerAccount>>("/api/v1/ledger/accounts");
}

export function fetchGodCheck() {
	return apiClient<GodCheckResult>("/api/v1/ledger/god-check");
}
