import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	createAccount,
	createVirtualAccount,
	fetchAccounts,
	fetchBalance,
	fetchVirtualAccounts,
} from "../api/accounts-api";

export function useAccounts(limit = 100) {
	return useQuery({
		queryKey: ["accounts", "list", { limit }],
		queryFn: () => fetchAccounts(limit),
	});
}

export function useCreateAccount() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (params: { name: string; email: string }) => createAccount(params),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["accounts", "list"] });
		},
	});
}

export function useVirtualAccounts(accountId: string) {
	return useQuery({
		queryKey: ["accounts", accountId, "virtual-accounts"],
		queryFn: () => fetchVirtualAccounts(accountId),
	});
}

export function useCreateVirtualAccount(accountId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (params: { currency: string; network?: string }) =>
			createVirtualAccount(accountId, params),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["accounts", accountId, "virtual-accounts"],
			});
		},
	});
}

export function useBalance(accountId: string, vacId: string) {
	return useQuery({
		queryKey: ["accounts", accountId, "virtual-accounts", vacId, "balance"],
		queryFn: () => fetchBalance(accountId, vacId),
	});
}
