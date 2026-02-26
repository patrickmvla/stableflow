import { useQuery } from "@tanstack/react-query";
import { fetchGodCheck, fetchLedgerAccounts } from "../api/ledger-api";

export function useLedgerAccounts() {
	return useQuery({
		queryKey: ["ledger", "accounts"],
		queryFn: fetchLedgerAccounts,
	});
}

export function useGodCheck() {
	return useQuery({
		queryKey: ["ledger", "god-check"],
		queryFn: fetchGodCheck,
		enabled: false,
	});
}
