import { apiClient } from "@/lib/api-client";
import type { ListResponse } from "@/types/api";
import type { ApiKey, ApiKeyCreateResponse } from "../types";

export function fetchApiKeys() {
	return apiClient<ListResponse<ApiKey>>("/api/v1/api-keys");
}

export function createApiKey(params: { name: string }) {
	return apiClient<ApiKeyCreateResponse>("/api/v1/api-keys", {
		method: "POST",
		body: JSON.stringify(params),
		headers: { "Idempotency-Key": crypto.randomUUID() },
	});
}

export function revokeApiKey(keyId: string) {
	return apiClient(`/api/v1/api-keys/${keyId}/revoke`, {
		method: "POST",
		headers: { "Idempotency-Key": crypto.randomUUID() },
	});
}
