import { defineConfig } from "drizzle-kit";

export default defineConfig({
	dialect: "postgresql",
	schema: [
		"../ledger/src/schema.ts",
		"../accounts/src/schema.ts",
		"../auth/src/schema.ts",
	],
	out: "./drizzle",
	dbCredentials: {
		url: process.env["DATABASE_URL"]!,
	},
});
