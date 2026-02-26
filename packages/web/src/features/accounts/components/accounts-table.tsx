"use client";

import { DataTable } from "@/components/ui/data-table";
import type { AccountHolder } from "../types";
import { accountsColumns } from "./accounts-columns";
import { VirtualAccountsRow } from "./virtual-accounts-row";

interface AccountsTableProps {
	accounts: AccountHolder[];
	isLoading: boolean;
}

export function AccountsTable({ accounts, isLoading }: AccountsTableProps) {
	return (
		<DataTable
			columns={accountsColumns}
			data={accounts}
			isLoading={isLoading}
			emptyMessage="No accounts yet. Create one to get started."
			getRowCanExpand={() => true}
			renderExpandedRow={(row) => <VirtualAccountsRow accountId={row.original.id} />}
		/>
	);
}
