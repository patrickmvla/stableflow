import type { ApiErrorResponse } from "@/types/api";
import { getStoredApiKey } from "./api-key-store";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3456";

export class ApiError extends Error {
	type: string;
	statusCode: number;
	details?: unknown;

	constructor(statusCode: number, body: ApiErrorResponse) {
		super(body.error.message);
		this.name = "ApiError";
		this.type = body.error.type;
		this.statusCode = statusCode;
		this.details = body.error.details;
	}
}

export async function apiClient<T>(
	path: string,
	options?: RequestInit & { skipAuth?: boolean },
): Promise<T> {
	const { skipAuth, ...fetchOptions } = options ?? {};
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		...(fetchOptions.headers as Record<string, string>),
	};

	if (!skipAuth) {
		const apiKey = getStoredApiKey();
		if (apiKey) {
			headers.Authorization = `Bearer ${apiKey}`;
		}
	}

	const res = await fetch(`${API_URL}${path}`, {
		...fetchOptions,
		headers,
	});

	if (!res.ok) {
		let body: ApiErrorResponse;
		try {
			body = await res.json();
		} catch {
			body = { error: { type: "NETWORK_ERROR", message: res.statusText } };
		}
		throw new ApiError(res.status, body);
	}

	return res.json();
}
