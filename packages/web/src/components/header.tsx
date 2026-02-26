"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { clearStoredApiKey, getStoredApiKey } from "@/lib/api-key-store";

export function Header() {
	const router = useRouter();
	const apiKey = getStoredApiKey();
	const keyPrefix = apiKey ? `${apiKey.slice(0, 12)}...` : "";

	function handleDisconnect() {
		clearStoredApiKey();
		router.push("/setup");
	}

	return (
		<header className="flex h-14 items-center gap-2 border-b px-4">
			<SidebarTrigger />
			<Separator orientation="vertical" className="h-6" />
			<div className="flex flex-1 items-center justify-end gap-3">
				{keyPrefix && (
					<Badge variant="secondary" className="font-mono text-xs">
						{keyPrefix}
					</Badge>
				)}
				<Button variant="ghost" size="sm" onClick={handleDisconnect}>
					<LogOut className="h-4 w-4" />
					<span className="hidden sm:inline">Disconnect</span>
				</Button>
			</div>
		</header>
	);
}
