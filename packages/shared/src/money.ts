import { InvalidAmountError } from "./errors.ts";

export type Currency = "USD" | "EUR" | "USDC" | "USDT";

export const CURRENCY_CONFIG: Record<Currency, { decimals: number; symbol: string }> = {
	USD: { decimals: 2, symbol: "$" },
	EUR: { decimals: 2, symbol: "€" },
	USDC: { decimals: 6, symbol: "USDC" },
	USDT: { decimals: 6, symbol: "USDT" },
};

export function toMinorUnits(major: number, currency: Currency): bigint {
	const { decimals } = CURRENCY_CONFIG[currency];
	const factor = 10 ** decimals;
	return BigInt(Math.round(major * factor));
}

export function fromMinorUnits(minor: bigint, currency: Currency): number {
	const { decimals } = CURRENCY_CONFIG[currency];
	const factor = 10 ** decimals;
	return Number(minor) / factor;
}

export function addAmounts(a: bigint, b: bigint): bigint {
	return a + b;
}

export function subtractAmounts(a: bigint, b: bigint): bigint {
	const result = a - b;
	if (result < 0n) {
		throw new InvalidAmountError("Subtraction would result in negative amount");
	}
	return result;
}

export function calculateFee(amount: bigint, feePercent: number): bigint {
	// fee = amount * feePercent / 100
	// Scale feePercent by 100 to avoid floats: feeNumerator = feePercent * 100
	// Then fee = amount * feeNumerator / 10000
	// e.g. 2.5% of 10000: feeNumerator=250, fee = 10000*250/10000 = 250
	const feeNumerator = BigInt(Math.round(feePercent * 100));
	return (amount * feeNumerator) / 10000n;
}

export function splitAmount(
	amount: bigint,
	feePercent: number,
): { merchantShare: bigint; fee: bigint } {
	const fee = calculateFee(amount, feePercent);
	const merchantShare = amount - fee;
	// Invariant: merchantShare + fee === amount (always)
	return { merchantShare, fee };
}

export function convertCurrency(amount: bigint, from: Currency, to: Currency): bigint {
	const fromDecimals = CURRENCY_CONFIG[from].decimals;
	const toDecimals = CURRENCY_CONFIG[to].decimals;

	if (fromDecimals === toDecimals) return amount;

	if (toDecimals > fromDecimals) {
		const factor = BigInt(10 ** (toDecimals - fromDecimals));
		return amount * factor;
	} else {
		const factor = BigInt(10 ** (fromDecimals - toDecimals));
		return amount / factor;
	}
}

export function formatAmount(amount: bigint, currency: Currency): string {
	const { decimals, symbol } = CURRENCY_CONFIG[currency];
	const factor = 10 ** decimals;
	const whole = amount / BigInt(factor);
	const fraction = amount % BigInt(factor);

	const fractionStr = fraction.toString().padStart(decimals, "0");

	if (currency === "USD" || currency === "EUR") {
		return `${symbol}${whole}.${fractionStr}`;
	}
	return `${whole}.${fractionStr} ${symbol}`;
}

// Test helpers
export function toCents(dollars: number): bigint {
	return toMinorUnits(dollars, "USD");
}

export function toMicro(units: number): bigint {
	return toMinorUnits(units, "USDC");
}
