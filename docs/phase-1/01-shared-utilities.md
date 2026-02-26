# Phase 1: Shared Utilities

## Package: `packages/shared/`

Foundation utilities used by every other package.

## ID Generation (`src/id.ts`)

Prefixed ULIDs for type-safe, sortable identifiers.

```typescript
type IdPrefix = "acc" | "vac" | "lac" | "txn" | "ent" | "pay" | "stl" | "prd" | "lnk" | "key" | "aud" | "evt";

function generateId<P extends IdPrefix>(prefix: P): `${P}_${string}`;

// Usage:
generateId("pay") // "pay_01JQXR5..."
generateId("txn") // "txn_01JQXR5..."
```

**Dependencies:** `ulidx` (monotonic factory for ordering guarantees)

## Money (`src/money.ts`)

BigInt arithmetic for precise financial calculations. **No floating point ever.**

```typescript
// Currency configuration
const CURRENCY_CONFIG: Record<Currency, { decimals: number; symbol: string }>;
// USD: 2 decimals, EUR: 2 decimals, USDC: 6 decimals, USDT: 6 decimals

type Currency = "USD" | "EUR" | "USDC" | "USDT";

// Conversion between major and minor units
function toMinorUnits(major: number, currency: Currency): bigint;
function fromMinorUnits(minor: bigint, currency: Currency): number;

// Safe arithmetic
function addAmounts(a: bigint, b: bigint): bigint;
function subtractAmounts(a: bigint, b: bigint): bigint; // throws if result < 0

// Fee calculation
function calculateFee(amount: bigint, feePercent: number): bigint;
function splitAmount(amount: bigint, feePercent: number): { merchantShare: bigint; fee: bigint };
// Invariant: merchantShare + fee === amount (always)

// Cross-currency conversion (stablecoin pegged 1:1)
function convertCurrency(amount: bigint, from: Currency, to: Currency): bigint;
// Handles decimal adjustment: USD cents (2) → USDC micro (6) = multiply by 10^4

// Display
function formatAmount(amount: bigint, currency: Currency): string;
// formatAmount(10000n, "USD") → "$100.00"
// formatAmount(100000000n, "USDC") → "100.000000 USDC"

// Test helpers
function toCents(dollars: number): bigint; // toCents(100) → 10000n
function toMicro(units: number): bigint;   // toMicro(100) → 100000000n
```

## Errors (`src/errors.ts`)

Structured error hierarchy for consistent API responses.

```typescript
class AppError extends Error {
  readonly type: string;
  readonly statusCode: number;
  readonly details?: Record<string, unknown>;
  toJSON(): { error: { type: string; message: string; details?: Record<string, unknown> } };
}

// Domain errors:
class NotFoundError extends AppError {}           // 404
class ValidationError extends AppError {}         // 400
class ConflictError extends AppError {}           // 409
class UnauthorizedError extends AppError {}       // 401
class ForbiddenError extends AppError {}          // 403
class InternalError extends AppError {}           // 500

// Specific errors:
class AccountNotFoundError extends NotFoundError {}
class PaymentNotFoundError extends NotFoundError {}
class SettlementNotFoundError extends NotFoundError {}
class InvalidStateTransitionError extends ConflictError {}
class IdempotencyConflictError extends ConflictError {}
class LedgerImbalanceError extends InternalError {}
class InsufficientFundsError extends ValidationError {}
class InvalidAmountError extends ValidationError {}
class APIKeyRevokedError extends UnauthorizedError {}
```

## Config (`src/config.ts`)

Zod-validated environment variables.

```typescript
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().default(3456),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  API_KEY_SALT: z.string().min(1),
});

function getConfig(): Config; // Lazy singleton, validates on first call
```

## Database (`src/db.ts`)

Drizzle ORM + postgres.js connection.

```typescript
function createDb(url: string): Database;
function getDb(): Database;        // Singleton for app
function closeDb(): Promise<void>;
```

## Schemas (`src/schemas.ts`)

Shared Zod schemas for API validation.

```typescript
// ID schemas
const AccountIdSchema = z.string().startsWith("acc_");
const VirtualAccountIdSchema = z.string().startsWith("vac_");
// ... etc for each prefix

// Common schemas
const PaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const CurrencySchema = z.enum(["USD", "EUR", "USDC", "USDT"]);

const MoneySchema = z.object({
  amount: z.coerce.bigint().positive(),
  currency: CurrencySchema,
});

const ErrorResponseSchema = z.object({
  error: z.object({
    type: z.string(),
    message: z.string(),
    details: z.record(z.unknown()).optional(),
  }),
});

function PaginatedResponseSchema<T>(itemSchema: ZodType<T>);
```

## Logger (`src/logger.ts`)

Structured JSON logger.

```typescript
const logger = {
  debug(msg: string, data?: Record<string, unknown>): void;
  info(msg: string, data?: Record<string, unknown>): void;
  warn(msg: string, data?: Record<string, unknown>): void;
  error(msg: string, data?: Record<string, unknown>): void;
};
```

## Exports (`src/index.ts`)

Re-exports everything for clean imports:
```typescript
export * from "./id.ts";
export * from "./money.ts";
export * from "./errors.ts";
export * from "./config.ts";
export * from "./db.ts";
export * from "./schemas.ts";
export * from "./logger.ts";
```
