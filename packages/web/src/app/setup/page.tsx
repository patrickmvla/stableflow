"use client";

import { KeyRound, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AccountHolder } from "@/features/accounts";
import { ApiError, apiClient } from "@/lib/api-client";
import { setStoredApiKey } from "@/lib/api-key-store";
import type { ListResponse } from "@/types/api";

export default function SetupPage() {
	const router = useRouter();
	const [apiKey, setApiKey] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	async function handleConnect() {
		if (!apiKey.trim()) {
			setError("Please enter an API key.");
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			setStoredApiKey(apiKey.trim());
			await apiClient<ListResponse<AccountHolder>>("/api/v1/accounts?limit=1");
			router.push("/");
		} catch (err) {
			setStoredApiKey("");
			if (err instanceof ApiError) {
				if (err.statusCode === 401) {
					setError("Invalid API key. Please check your key and try again.");
				} else {
					setError(`API error: ${err.message}`);
				}
			} else {
				setError("Cannot connect to API server. Make sure it's running on port 3456.");
			}
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-background p-4">
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
						<KeyRound className="h-6 w-6 text-primary" />
					</div>
					<CardTitle className="text-2xl">Connect to StableFlow</CardTitle>
					<CardDescription>
						Enter your API key to connect to the StableFlow API server.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form
						onSubmit={(e) => {
							e.preventDefault();
							handleConnect();
						}}
						className="space-y-4"
					>
						<div className="space-y-2">
							<Label htmlFor="api-key">API Key</Label>
							<Input
								id="api-key"
								type="password"
								placeholder="sf_live_..."
								value={apiKey}
								onChange={(e) => setApiKey(e.target.value)}
								disabled={isLoading}
							/>
						</div>
						{error && <p className="text-sm text-destructive">{error}</p>}
						<Button type="submit" className="w-full" disabled={isLoading}>
							{isLoading ? (
								<>
									<Loader2 className="h-4 w-4 animate-spin" />
									Connecting...
								</>
							) : (
								"Connect"
							)}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
