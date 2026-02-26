import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createApiKey, fetchApiKeys, revokeApiKey } from "../api/api-keys-api";

export function useApiKeys() {
	return useQuery({
		queryKey: ["api-keys", "list"],
		queryFn: fetchApiKeys,
	});
}

export function useCreateApiKey() {
	return useMutation({
		mutationFn: (params: { name: string }) => createApiKey(params),
	});
}

export function useInvalidateApiKeys() {
	const queryClient = useQueryClient();
	return () => queryClient.invalidateQueries({ queryKey: ["api-keys", "list"] });
}

export function useRevokeApiKey() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (keyId: string) => revokeApiKey(keyId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["api-keys", "list"] });
		},
	});
}
