"use client";

import type { UseMutationResult } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
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

interface RevokeKeyDialogProps {
	keyId: string;
	keyName: string;
	revokeMutation: UseMutationResult<unknown, Error, string>;
}

export function RevokeKeyDialog({ keyId, keyName, revokeMutation }: RevokeKeyDialogProps) {
	const [open, setOpen] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleRevoke() {
		setError(null);
		try {
			await revokeMutation.mutateAsync(keyId);
			setOpen(false);
		} catch {
			setError("Failed to revoke key.");
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="destructive" size="sm">
					Revoke
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Revoke API Key</DialogTitle>
					<DialogDescription>
						Are you sure you want to revoke &quot;{keyName}&quot;? This action cannot be undone.
					</DialogDescription>
				</DialogHeader>
				{error && <p className="text-sm text-destructive">{error}</p>}
				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => setOpen(false)}
						disabled={revokeMutation.isPending}
					>
						Cancel
					</Button>
					<Button variant="destructive" onClick={handleRevoke} disabled={revokeMutation.isPending}>
						{revokeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
						Revoke
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
