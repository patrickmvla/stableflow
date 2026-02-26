import { z } from "zod";

const envSchema = z.object({
	DATABASE_URL: z.string().url(),
	PORT: z.coerce.number().default(3456),
	NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
	LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
	API_KEY_SALT: z.string().min(1),
});

export type Config = z.infer<typeof envSchema>;

let _config: Config | undefined;

export function getConfig(): Config {
	if (!_config) {
		const result = envSchema.safeParse(process.env);
		if (!result.success) {
			throw new Error(
				`Invalid environment variables:\n${result.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n")}`,
			);
		}
		_config = result.data;
	}
	return _config;
}

// For testing — reset singleton
export function resetConfig(): void {
	_config = undefined;
}
