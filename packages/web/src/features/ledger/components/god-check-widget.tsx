"use client";

import { CheckCircle, Loader2, RefreshCw, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useGodCheck } from "../hooks/use-ledger";

export function GodCheckWidget() {
	const { data: result, isLoading, isFetching, refetch } = useGodCheck();

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
				<CardTitle className="text-sm font-medium">God Check</CardTitle>
				<Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
					{isFetching ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						<RefreshCw className="h-4 w-4" />
					)}
					Run God Check
				</Button>
			</CardHeader>
			<CardContent>
				{isLoading && !result ? (
					<div className="space-y-2">
						<Skeleton className="h-10 w-48" />
						<Skeleton className="h-6 w-full" />
					</div>
				) : !result ? (
					<p className="text-sm text-muted-foreground">
						Click &quot;Run God Check&quot; to verify system balance.
					</p>
				) : (
					<div className="space-y-4">
						<div className="flex items-center gap-3">
							{result.balanced ? (
								<>
									<CheckCircle className="h-8 w-8 text-green-500" />
									<span className="text-lg font-semibold text-green-600">System Balanced</span>
								</>
							) : (
								<>
									<XCircle className="h-8 w-8 text-red-500" />
									<span className="text-lg font-semibold text-red-600">SYSTEM IMBALANCED</span>
								</>
							)}
						</div>
						{Object.keys(result.currencies).length > 0 && (
							<div className="space-y-2">
								<p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
									Per-Currency Breakdown
								</p>
								<div className="grid gap-2">
									{Object.entries(result.currencies).map(([currency, data]) => (
										<div
											key={currency}
											className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
										>
											<span className="font-medium">{currency}</span>
											<div className="flex items-center gap-3">
												<span className="text-muted-foreground">
													D: {data.total_debits} / C: {data.total_credits}
												</span>
												<Badge variant={data.balanced ? "default" : "destructive"}>
													{data.balanced ? "Balanced" : "Imbalanced"}
												</Badge>
											</div>
										</div>
									))}
								</div>
							</div>
						)}
						<p className="text-xs text-muted-foreground">
							Checked at {new Date(result.checked_at).toLocaleString()}
						</p>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
