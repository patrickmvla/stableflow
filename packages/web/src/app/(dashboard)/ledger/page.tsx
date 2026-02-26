"use client";

import { Button } from "@/components/ui/button";
import { GodCheckWidget, LedgerAccountsTable, useLedgerAccounts } from "@/features/ledger";

export default function LedgerPage() {
	const { data, error, isLoading, refetch } = useLedgerAccounts();

	return (
		<div className="space-y-6">
			<h1 className="text-2xl font-bold tracking-tight">Ledger Explorer</h1>
			{error && (
				<div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
					<span>Failed to load ledger accounts.</span>
					<Button variant="outline" size="sm" onClick={() => refetch()}>
						Retry
					</Button>
				</div>
			)}
			<GodCheckWidget />
			<LedgerAccountsTable accounts={data?.data ?? []} isLoading={isLoading} />
		</div>
	);
}
