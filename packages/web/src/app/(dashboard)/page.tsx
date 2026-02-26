"use client";

import { Users, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BalanceTable, StatCard, useOverviewStats } from "@/features/overview";

export default function OverviewPage() {
	const { data, error, isLoading, refetch } = useOverviewStats();

	return (
		<div className="space-y-6">
			<h1 className="text-2xl font-bold tracking-tight">Overview</h1>
			{error && (
				<div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
					<span>Failed to load overview data.</span>
					<Button variant="outline" size="sm" onClick={() => refetch()}>
						Retry
					</Button>
				</div>
			)}
			<div className="grid gap-4 md:grid-cols-2">
				<StatCard
					title="Total Accounts"
					value={data?.accounts.length ?? 0}
					icon={Users}
					isLoading={isLoading}
				/>
				<StatCard
					title="Total Virtual Accounts"
					value={data?.vacCount ?? 0}
					icon={Wallet}
					isLoading={isLoading}
				/>
			</div>
			<BalanceTable
				balances={(data?.balances ?? []).map((b) => ({
					currency: b.currency,
					formatted: b.formatted,
				}))}
				isLoading={isLoading}
			/>
		</div>
	);
}
