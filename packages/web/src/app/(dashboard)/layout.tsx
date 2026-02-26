"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { Header } from "@/components/header";
import { SidebarProvider } from "@/components/ui/sidebar";
import { getStoredApiKey } from "@/lib/api-key-store";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
	const router = useRouter();
	const [ready, setReady] = useState(false);

	useEffect(() => {
		const key = getStoredApiKey();
		if (!key) {
			router.replace("/setup");
		} else {
			setReady(true);
		}
	}, [router]);

	if (!ready) return null;

	return (
		<SidebarProvider>
			<AppSidebar />
			<div className="flex flex-1 flex-col">
				<Header />
				<main className="flex-1 overflow-auto p-6">{children}</main>
			</div>
		</SidebarProvider>
	);
}
