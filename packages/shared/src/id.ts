import { monotonicFactory } from "ulidx";

const ulid = monotonicFactory();

export type IdPrefix =
	| "acc"
	| "vac"
	| "lac"
	| "txn"
	| "ent"
	| "pay"
	| "stl"
	| "prd"
	| "lnk"
	| "key"
	| "aud"
	| "evt";

export function generateId<P extends IdPrefix>(prefix: P): `${P}_${string}` {
	return `${prefix}_${ulid()}`;
}
