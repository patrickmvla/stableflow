"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { DataTable } from "@/components/ui/data-table";
import { useRevokeApiKey } from "../hooks/use-api-keys";
import type { ApiKey } from "../types";
import { apiKeysColumns } from "./api-keys-columns";
import { RevokeKeyDialog } from "./revoke-key-dialog";

interface ApiKeysTableProps {
	keys: ApiKey[];
	isLoading: boolean;
}

export function ApiKeysTable({ keys, isLoading }: ApiKeysTableProps) {
	const revokeMutation = useRevokeApiKey();

	const columns = useMemo<ColumnDef<ApiKey, unknown>[]>(
		() => [
			...apiKeysColumns,
			{
				id: "actions",
				header: () => <span className="block text-right">Actions</span>,
				cell: ({ row }) => {
					const key = row.original;
					if (key.revoked_at) return null;
					return (
						<div className="text-right">
							<RevokeKeyDialog keyId={key.id} keyName={key.name} revokeMutation={revokeMutation} />
						</div>
					);
				},
			},
		],
		[revokeMutation],
	);

	return (
		<DataTable
			columns={columns}
			data={keys}
			isLoading={isLoading}
			emptyMessage="No API keys yet."
		/>
	);
}
