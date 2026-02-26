"use client";

import { DataTable } from "@/components/ui/data-table";
import type { LedgerAccount } from "../types";
import { ledgerColumns } from "./ledger-columns";

interface LedgerAccountsTableProps {
	accounts: LedgerAccount[];
	isLoading: boolean;
}

export function LedgerAccountsTable({ accounts, isLoading }: LedgerAccountsTableProps) {
	return (
		<DataTable
			columns={ledgerColumns}
			data={accounts}
			isLoading={isLoading}
			emptyMessage="No ledger accounts."
		/>
	);
}
