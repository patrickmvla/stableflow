"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import type { LedgerAccount } from "../types";

const typeBadgeVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
	asset: "default",
	liability: "secondary",
	equity: "outline",
	revenue: "default",
	expense: "destructive",
};

export const ledgerColumns: ColumnDef<LedgerAccount, unknown>[] = [
	{
		accessorKey: "name",
		header: "Account",
		cell: ({ getValue }) => <span className="font-mono text-sm">{getValue<string>()}</span>,
	},
	{
		accessorKey: "type",
		header: "Type",
		cell: ({ getValue }) => {
			const type = getValue<string>();
			return <Badge variant={typeBadgeVariant[type] ?? "secondary"}>{type}</Badge>;
		},
	},
	{
		accessorKey: "currency",
		header: "Currency",
	},
	{
		accessorKey: "formatted_balance",
		header: "Balance",
		cell: ({ getValue }) => (
			<span className="text-right font-mono block">{getValue<string>()}</span>
		),
	},
];
