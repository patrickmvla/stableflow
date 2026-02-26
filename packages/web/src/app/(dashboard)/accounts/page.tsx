"use client";

import { Button } from "@/components/ui/button";
import { AccountsTable, CreateAccountDialog, useAccounts } from "@/features/accounts";

export default function AccountsPage() {
	const { data, error, isLoading, refetch } = useAccounts();

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-bold tracking-tight">Accounts</h1>
				<CreateAccountDialog />
			</div>
			{error && (
				<div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
					<span>Failed to load accounts.</span>
					<Button variant="outline" size="sm" onClick={() => refetch()}>
						Retry
					</Button>
				</div>
			)}
			<AccountsTable accounts={data?.data ?? []} isLoading={isLoading} />
		</div>
	);
}
