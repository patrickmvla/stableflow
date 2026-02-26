"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AccountHolder } from "../types";

export const accountsColumns: ColumnDef<AccountHolder, unknown>[] = [
	{
		id: "expander",
		size: 32,
		header: () => null,
		cell: ({ row }) =>
			row.getCanExpand() ? (
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						row.toggleExpanded();
					}}
					className="cursor-pointer"
				>
					{row.getIsExpanded() ? (
						<ChevronDown className="h-4 w-4" />
					) : (
						<ChevronRight className="h-4 w-4" />
					)}
				</button>
			) : null,
	},
	{
		accessorKey: "name",
		header: "Name",
		cell: ({ getValue }) => <span className="font-medium">{getValue<string>()}</span>,
	},
	{
		accessorKey: "email",
		header: "Email",
	},
	{
		accessorKey: "status",
		header: "Status",
		cell: ({ getValue }) => {
			const status = getValue<string>();
			return <Badge variant={status === "active" ? "default" : "destructive"}>{status}</Badge>;
		},
	},
	{
		accessorKey: "created_at",
		header: "Created",
		cell: ({ getValue }) => new Date(getValue<string>()).toLocaleDateString(),
	},
];
