"use client";

import { Copy, Loader2, Plus, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateApiKey, useInvalidateApiKeys } from "../hooks/use-api-keys";

export function CreateKeyDialog() {
	const [open, setOpen] = useState(false);
	const [name, setName] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [createdKey, setCreatedKey] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);
	const mutation = useCreateApiKey();
	const invalidateApiKeys = useInvalidateApiKeys();

	function handleClose() {
		setOpen(false);
		setName("");
		setCopied(false);
		setError(null);
		if (createdKey) invalidateApiKeys();
		setCreatedKey(null);
	}

	async function handleSubmit() {
		if (!name.trim()) {
			setError("Please enter a name.");
			return;
		}
		setError(null);
		try {
			const result = await mutation.mutateAsync({ name: name.trim() });
			setCreatedKey(result.plaintext);
		} catch {
			setError("Failed to create API key.");
		}
	}

	async function handleCopy() {
		if (!createdKey) return;
		await navigator.clipboard.writeText(createdKey);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}

	return (
		<Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : handleClose())}>
			<DialogTrigger asChild>
				<Button size="sm">
					<Plus className="h-4 w-4" />
					Create API Key
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{createdKey ? "API Key Created" : "Create API Key"}</DialogTitle>
					<DialogDescription>
						{createdKey
							? "Copy your key now. It won't be shown again."
							: "Create a new API key for programmatic access."}
					</DialogDescription>
				</DialogHeader>
				{createdKey ? (
					<div className="space-y-4 py-2">
						<Alert variant="destructive">
							<TriangleAlert className="h-4 w-4" />
							<AlertTitle>This key will only be shown once</AlertTitle>
							<AlertDescription>
								Make sure to copy it now. You won&apos;t be able to see it again.
							</AlertDescription>
						</Alert>
						<div className="flex items-center gap-2">
							<code className="flex-1 rounded-md border bg-muted px-3 py-2 text-sm font-mono break-all">
								{createdKey}
							</code>
							<Button variant="outline" size="icon" onClick={handleCopy}>
								<Copy className="h-4 w-4" />
							</Button>
						</div>
						{copied && <p className="text-sm text-green-600">Copied to clipboard!</p>}
					</div>
				) : (
					<div className="space-y-4 py-2">
						<div className="space-y-2">
							<Label htmlFor="key-name">Name</Label>
							<Input
								id="key-name"
								placeholder="e.g. Production Key"
								value={name}
								onChange={(e) => setName(e.target.value)}
								disabled={mutation.isPending}
							/>
						</div>
						{error && <p className="text-sm text-destructive">{error}</p>}
					</div>
				)}
				<DialogFooter>
					{createdKey ? (
						<Button onClick={handleClose}>Done</Button>
					) : (
						<>
							<Button variant="outline" onClick={handleClose} disabled={mutation.isPending}>
								Cancel
							</Button>
							<Button onClick={handleSubmit} disabled={mutation.isPending}>
								{mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
								Create
							</Button>
						</>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
