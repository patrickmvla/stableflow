"use client";

import { Button } from "@/components/ui/button";
import { ApiKeysTable, CreateKeyDialog, useApiKeys } from "@/features/api-keys";

export default function ApiKeysPage() {
	const { data, error, isLoading, refetch } = useApiKeys();

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-bold tracking-tight">API Keys</h1>
				<CreateKeyDialog />
			</div>
			{error && (
				<div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
					<span>Failed to load API keys.</span>
					<Button variant="outline" size="sm" onClick={() => refetch()}>
						Retry
					</Button>
				</div>
			)}
			<ApiKeysTable keys={data?.data ?? []} isLoading={isLoading} />
		</div>
	);
}
