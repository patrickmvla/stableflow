export interface ApiKey {
	object: "api_key";
	id: string;
	name: string;
	prefix: string;
	created_at: string;
	revoked_at: string | null;
}

export interface ApiKeyCreateResponse {
	object: "api_key";
	id: string;
	name: string;
	prefix: string;
	plaintext: string;
	created_at: string;
}
