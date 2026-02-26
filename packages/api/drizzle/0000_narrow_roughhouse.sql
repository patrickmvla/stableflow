CREATE TABLE "ledger_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"currency" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ledger_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"transaction_id" text NOT NULL,
	"account_id" text NOT NULL,
	"direction" text NOT NULL,
	"amount" bigint NOT NULL,
	"currency" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ledger_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"description" text NOT NULL,
	"reference_type" text,
	"reference_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account_holders" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "virtual_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_holder_id" text NOT NULL,
	"currency" text NOT NULL,
	"type" text NOT NULL,
	"network" text,
	"ledger_account_id" text NOT NULL,
	"holds_ledger_account_id" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_virtual_accounts_holder_currency_network" UNIQUE("account_holder_id","currency","network")
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"account_holder_id" text NOT NULL,
	"name" text NOT NULL,
	"prefix" text NOT NULL,
	"key_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_type" text NOT NULL,
	"actor_id" text NOT NULL,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text NOT NULL,
	"metadata" jsonb,
	"ip_address" text,
	"user_agent" text,
	"request_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_transaction_id_ledger_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."ledger_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_account_id_ledger_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."ledger_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "virtual_accounts" ADD CONSTRAINT "virtual_accounts_account_holder_id_account_holders_id_fk" FOREIGN KEY ("account_holder_id") REFERENCES "public"."account_holders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_ledger_accounts_type" ON "ledger_accounts" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_ledger_accounts_currency" ON "ledger_accounts" USING btree ("currency");--> statement-breakpoint
CREATE INDEX "idx_ledger_entries_account" ON "ledger_entries" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_ledger_entries_transaction" ON "ledger_entries" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "idx_ledger_entries_currency" ON "ledger_entries" USING btree ("currency");--> statement-breakpoint
CREATE INDEX "idx_ledger_transactions_reference" ON "ledger_transactions" USING btree ("reference_type","reference_id");--> statement-breakpoint
CREATE INDEX "idx_account_holders_email" ON "account_holders" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_account_holders_status" ON "account_holders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_virtual_accounts_holder" ON "virtual_accounts" USING btree ("account_holder_id");--> statement-breakpoint
CREATE INDEX "idx_api_keys_hash" ON "api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "idx_api_keys_holder" ON "api_keys" USING btree ("account_holder_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_actor" ON "audit_logs" USING btree ("actor_type","actor_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_resource" ON "audit_logs" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_action" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_created" ON "audit_logs" USING btree ("created_at");