import type { Database } from "@stableflow/shared";
import { godCheck } from "@stableflow/ledger";

export async function verifyGodCheck(db: Database): Promise<void> {
	const result = await godCheck(db);
	if (!result.balanced) {
		const details = Object.entries(result.currencies)
			.filter(([, v]) => !v.balanced)
			.map(([k, v]) => `${k}: debits=${v.totalDebits}, credits=${v.totalCredits}`)
			.join("; ");
		throw new Error(`GOD CHECK FAILED: ${details}`);
	}
}
