"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import type { ApiKey } from "../types";

export const apiKeysColumns: ColumnDef<ApiKey, unknown>[] = [
	{
		accessorKey: "name",
		header: "Name",
		cell: ({ getValue }) => <span className="font-medium">{getValue<string>()}</span>,
	},
	{
		accessorKey: "prefix",
		header: "Prefix",
		cell: ({ getValue }) => <code className="text-xs">{getValue<string>()}</code>,
	},
	{
		accessorKey: "created_at",
		header: "Created",
		cell: ({ getValue }) => new Date(getValue<string>()).toLocaleDateString(),
	},
	{
		accessorKey: "revoked_at",
		header: "Status",
		cell: ({ getValue }) => {
			const isRevoked = !!getValue<string | null>();
			return (
				<Badge variant={isRevoked ? "destructive" : "default"}>
					{isRevoked ? "Revoked" : "Active"}
				</Badge>
			);
		},
	},
];
