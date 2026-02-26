"use client";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useBalance, useVirtualAccounts } from "../hooks/use-accounts";
import type { VirtualAccount } from "../types";
import { AddVirtualAccountDialog } from "./add-virtual-account-dialog";

interface VirtualAccountsRowProps {
	accountId: string;
}

export function VirtualAccountsRow({ accountId }: VirtualAccountsRowProps) {
	const { data, isLoading } = useVirtualAccounts(accountId);
	const vacs = data?.data ?? [];

	return (
		<div className="space-y-3 p-4">
			<div className="flex items-center justify-between">
				<span className="text-sm font-medium text-muted-foreground">Virtual Accounts</span>
				<AddVirtualAccountDialog accountId={accountId} />
			</div>
			{isLoading ? (
				<div className="space-y-2">
					<Skeleton className="h-6 w-full" />
					<Skeleton className="h-6 w-full" />
				</div>
			) : vacs.length === 0 ? (
				<p className="text-sm text-muted-foreground">No virtual accounts yet.</p>
			) : (
				<div className="rounded-md border">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b bg-muted/50">
								<th className="px-3 py-2 text-left font-medium">Currency</th>
								<th className="px-3 py-2 text-left font-medium">Type</th>
								<th className="px-3 py-2 text-left font-medium">Network</th>
								<th className="px-3 py-2 text-right font-medium">Balance</th>
								<th className="px-3 py-2 text-left font-medium">Status</th>
							</tr>
						</thead>
						<tbody>
							{vacs.map((vac) => (
								<VacRow key={vac.id} accountId={accountId} vac={vac} />
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}

function VacRow({ accountId, vac }: { accountId: string; vac: VirtualAccount }) {
	const { data: balance } = useBalance(accountId, vac.id);

	return (
		<tr className="border-b last:border-0">
			<td className="px-3 py-2 font-medium">{vac.currency}</td>
			<td className="px-3 py-2">
				<Badge variant="secondary">{vac.type}</Badge>
			</td>
			<td className="px-3 py-2 text-muted-foreground">{vac.network ?? "\u2014"}</td>
			<td className="px-3 py-2 text-right font-mono">{balance?.formatted ?? "\u2014"}</td>
			<td className="px-3 py-2">
				<Badge variant={vac.status === "active" ? "default" : "destructive"}>{vac.status}</Badge>
			</td>
		</tr>
	);
}
