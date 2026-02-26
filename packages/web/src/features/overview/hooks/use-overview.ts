import { useQuery } from "@tanstack/react-query";
import { fetchOverviewStats } from "../api/overview-api";

export function useOverviewStats() {
	return useQuery({
		queryKey: ["overview", "stats"],
		queryFn: fetchOverviewStats,
	});
}
