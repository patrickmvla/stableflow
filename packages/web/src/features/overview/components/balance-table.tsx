"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

interface BalanceRow {
	currency: string;
	formatted: string;
}

interface BalanceTableProps {
	balances: BalanceRow[];
	isLoading?: boolean;
}

export function BalanceTable({ balances, isLoading }: BalanceTableProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-sm font-medium">Balance by Currency</CardTitle>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<div className="space-y-2">
						<Skeleton className="h-8 w-full" />
						<Skeleton className="h-8 w-full" />
					</div>
				) : balances.length === 0 ? (
					<p className="text-sm text-muted-foreground">No balances yet.</p>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Currency</TableHead>
								<TableHead className="text-right">Total Balance</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{balances.map((row) => (
								<TableRow key={row.currency}>
									<TableCell className="font-medium">{row.currency}</TableCell>
									<TableCell className="text-right font-mono">{row.formatted}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</CardContent>
		</Card>
	);
}
