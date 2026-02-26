"use client";

import { Loader2, Plus } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useCreateVirtualAccount } from "../hooks/use-accounts";

const CURRENCIES = ["USD", "EUR", "USDC", "USDT"] as const;

interface AddVirtualAccountDialogProps {
	accountId: string;
}

export function AddVirtualAccountDialog({ accountId }: AddVirtualAccountDialogProps) {
	const [open, setOpen] = useState(false);
	const [currency, setCurrency] = useState<string>("");
	const [network, setNetwork] = useState("");
	const [error, setError] = useState<string | null>(null);
	const mutation = useCreateVirtualAccount(accountId);

	const isStablecoin = currency === "USDC" || currency === "USDT";

	async function handleSubmit() {
		if (!currency) {
			setError("Please select a currency.");
			return;
		}
		setError(null);
		try {
			const params: { currency: string; network?: string } = { currency };
			if (isStablecoin && network.trim()) {
				params.network = network.trim();
			}
			await mutation.mutateAsync(params);
			setOpen(false);
			setCurrency("");
			setNetwork("");
		} catch {
			setError("Failed to create virtual account.");
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm">
					<Plus className="h-4 w-4" />
					Add Virtual Account
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Add Virtual Account</DialogTitle>
					<DialogDescription>Create a new virtual account for this merchant.</DialogDescription>
				</DialogHeader>
				<div className="space-y-4 py-2">
					<div className="space-y-2">
						<Label>Currency</Label>
						<Select value={currency} onValueChange={setCurrency}>
							<SelectTrigger>
								<SelectValue placeholder="Select currency" />
							</SelectTrigger>
							<SelectContent>
								{CURRENCIES.map((c) => (
									<SelectItem key={c} value={c}>
										{c}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					{isStablecoin && (
						<div className="space-y-2">
							<Label htmlFor="network">Network</Label>
							<Input
								id="network"
								placeholder="e.g. Polygon, Ethereum"
								value={network}
								onChange={(e) => setNetwork(e.target.value)}
								disabled={mutation.isPending}
							/>
						</div>
					)}
					{error && <p className="text-sm text-destructive">{error}</p>}
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => setOpen(false)} disabled={mutation.isPending}>
						Cancel
					</Button>
					<Button onClick={handleSubmit} disabled={mutation.isPending}>
						{mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
						Create
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
