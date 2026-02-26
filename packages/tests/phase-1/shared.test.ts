import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
	addAmounts,
	calculateFee,
	convertCurrency,
	formatAmount,
	fromMinorUnits,
	generateId,
	InvalidAmountError,
	resetConfig,
	splitAmount,
	subtractAmounts,
	toCents,
	toMicro,
	toMinorUnits,
} from "@stableflow/shared";

// ---- ID Generation ----

describe("generateId", () => {
	test("generates prefixed ULID with correct prefix", () => {
		const id = generateId("pay");
		expect(id).toMatch(/^pay_[0-9A-Z]{26}$/);
	});

	test("generates acc_ prefixed ID", () => {
		const id = generateId("acc");
		expect(id).toMatch(/^acc_/);
	});

	test("generates unique IDs (no collisions in 1000)", () => {
		const ids = new Set(Array.from({ length: 1000 }, () => generateId("txn")));
		expect(ids.size).toBe(1000);
	});

	test("IDs are sortable by creation time", () => {
		const ids = Array.from({ length: 5 }, () => generateId("ent"));
		const sorted = [...ids].sort();
		expect(sorted).toEqual(ids);
	});
});

// ---- Money ----

describe("toMinorUnits", () => {
	test("USD: 1 dollar = 100 cents", () => {
		expect(toMinorUnits(1, "USD")).toBe(100n);
	});
	test("USD: 100 dollars = 10000 cents", () => {
		expect(toMinorUnits(100, "USD")).toBe(10000n);
	});
	test("EUR: 1 euro = 100 cents", () => {
		expect(toMinorUnits(1, "EUR")).toBe(100n);
	});
	test("USDC: 1 unit = 1_000_000 micro", () => {
		expect(toMinorUnits(1, "USDC")).toBe(1_000_000n);
	});
	test("USDT: 100 units = 100_000_000 micro", () => {
		expect(toMinorUnits(100, "USDT")).toBe(100_000_000n);
	});
});

describe("fromMinorUnits", () => {
	test("USD: 100 cents = 1 dollar", () => {
		expect(fromMinorUnits(100n, "USD")).toBe(1);
	});
	test("USDC: 1_000_000 micro = 1 unit", () => {
		expect(fromMinorUnits(1_000_000n, "USDC")).toBe(1);
	});
});

describe("addAmounts", () => {
	test("adds two bigints", () => {
		expect(addAmounts(100n, 200n)).toBe(300n);
	});
	test("handles zero", () => {
		expect(addAmounts(0n, 500n)).toBe(500n);
	});
});

describe("subtractAmounts", () => {
	test("subtracts correctly", () => {
		expect(subtractAmounts(500n, 200n)).toBe(300n);
	});
	test("throws on negative result", () => {
		expect(() => subtractAmounts(100n, 200n)).toThrow(InvalidAmountError);
	});
	test("allows zero result", () => {
		expect(subtractAmounts(100n, 100n)).toBe(0n);
	});
});

describe("calculateFee", () => {
	test("2.5% of 10000 cents", () => {
		// 2.5% of $100 = $2.50 = 250 cents
		expect(calculateFee(10000n, 2.5)).toBe(250n);
	});
	test("0% fee", () => {
		expect(calculateFee(10000n, 0)).toBe(0n);
	});
	test("1% fee", () => {
		// 1% of 10000 = 100
		expect(calculateFee(10000n, 1)).toBe(100n);
	});
});

describe("splitAmount", () => {
	test("merchantShare + fee === amount always", () => {
		const amount = 10007n;
		const { merchantShare, fee } = splitAmount(amount, 2.5);
		expect(merchantShare + fee).toBe(amount);
	});
	test("zero fee: merchant gets everything", () => {
		const { merchantShare, fee } = splitAmount(10000n, 0);
		expect(fee).toBe(0n);
		expect(merchantShare).toBe(10000n);
	});
	test("non-zero fee splits correctly", () => {
		const { merchantShare, fee } = splitAmount(10000n, 2.5);
		expect(fee).toBe(250n);
		expect(merchantShare).toBe(9750n);
		expect(merchantShare + fee).toBe(10000n);
	});
});

describe("convertCurrency", () => {
	test("USD cents to USDC micro: multiply by 10^4", () => {
		// $1.00 = 100 USD cents → 1_000_000 USDC micro
		expect(convertCurrency(100n, "USD", "USDC")).toBe(1_000_000n);
	});
	test("same decimals: no conversion", () => {
		expect(convertCurrency(100n, "USD", "EUR")).toBe(100n);
	});
	test("USDC micro to USD cents: divide by 10^4", () => {
		expect(convertCurrency(1_000_000n, "USDC", "USD")).toBe(100n);
	});
});

describe("formatAmount", () => {
	test("USD: 10000 cents = $100.00", () => {
		expect(formatAmount(10000n, "USD")).toBe("$100.00");
	});
	test("USD: 1 cent = $0.01", () => {
		expect(formatAmount(1n, "USD")).toBe("$0.01");
	});
	test("USDC: 100_000_000 micro = 100.000000 USDC", () => {
		expect(formatAmount(100_000_000n, "USDC")).toBe("100.000000 USDC");
	});
	test("EUR: 100 cents = €1.00", () => {
		expect(formatAmount(100n, "EUR")).toBe("€1.00");
	});
});

describe("toCents / toMicro helpers", () => {
	test("toCents(100) = 10000n", () => {
		expect(toCents(100)).toBe(10000n);
	});
	test("toMicro(100) = 100_000_000n", () => {
		expect(toMicro(100)).toBe(100_000_000n);
	});
});

// ---- Config ----

describe("getConfig", () => {
	let savedDbUrl: string | undefined;
	let savedSalt: string | undefined;

	beforeEach(() => {
		savedDbUrl = process.env["DATABASE_URL"];
		savedSalt = process.env["API_KEY_SALT"];
		resetConfig();
	});

	afterEach(() => {
		// Always restore the real env vars so later test files aren't affected
		if (savedDbUrl !== undefined) {
			process.env["DATABASE_URL"] = savedDbUrl;
		} else {
			delete process.env["DATABASE_URL"];
		}
		if (savedSalt !== undefined) {
			process.env["API_KEY_SALT"] = savedSalt;
		} else {
			delete process.env["API_KEY_SALT"];
		}
		resetConfig();
	});

	test("validates required env vars", async () => {
		process.env["DATABASE_URL"] = "postgresql://test:test@localhost/test";
		process.env["API_KEY_SALT"] = "test-salt";
		const { getConfig: gc } = await import("@stableflow/shared");
		const config = gc();
		expect(config.DATABASE_URL).toBe("postgresql://test:test@localhost/test");
		expect(config.PORT).toBe(3456); // default
	});

	test("throws on missing DATABASE_URL", async () => {
		delete process.env["DATABASE_URL"];
		const { getConfig: gc } = await import("@stableflow/shared");
		expect(() => gc()).toThrow();
	});
});
