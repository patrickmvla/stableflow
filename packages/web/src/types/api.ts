export interface ListResponse<T> {
	object: "list";
	data: T[];
	pagination?: {
		next_cursor: string | null;
		has_more: boolean;
	};
}

export interface HealthResponse {
	status: "ok";
	version: string;
	timestamp: string;
}

export interface ApiErrorResponse {
	error: {
		type: string;
		message: string;
		details?: unknown;
	};
}
