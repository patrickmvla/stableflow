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
import { useCreateAccount } from "../hooks/use-accounts";

export function CreateAccountDialog() {
	const [open, setOpen] = useState(false);
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [error, setError] = useState<string | null>(null);
	const mutation = useCreateAccount();

	async function handleSubmit() {
		if (!name.trim() || !email.trim()) {
			setError("Name and email are required.");
			return;
		}
		setError(null);
		try {
			await mutation.mutateAsync({ name: name.trim(), email: email.trim() });
			setOpen(false);
			setName("");
			setEmail("");
		} catch {
			setError("Failed to create account.");
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button size="sm">
					<Plus className="h-4 w-4" />
					Create Account
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Create Account Holder</DialogTitle>
					<DialogDescription>Add a new merchant account to StableFlow.</DialogDescription>
				</DialogHeader>
				<div className="space-y-4 py-2">
					<div className="space-y-2">
						<Label htmlFor="name">Name</Label>
						<Input
							id="name"
							placeholder="Acme Corp"
							value={name}
							onChange={(e) => setName(e.target.value)}
							disabled={mutation.isPending}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="email">Email</Label>
						<Input
							id="email"
							type="email"
							placeholder="billing@acme.com"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							disabled={mutation.isPending}
						/>
					</div>
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
