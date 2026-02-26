"use client";

import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	getExpandedRowModel,
	type Row,
	type Table as TanStackTable,
	useReactTable,
} from "@tanstack/react-table";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

interface DataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[];
	data: TData[];
	isLoading?: boolean;
	emptyMessage?: string;
	getRowCanExpand?: (row: Row<TData>) => boolean;
	renderExpandedRow?: (row: Row<TData>) => React.ReactNode;
	onTableReady?: (table: TanStackTable<TData>) => void;
}

export function DataTable<TData, TValue>({
	columns,
	data,
	isLoading,
	emptyMessage = "No results.",
	getRowCanExpand,
	renderExpandedRow,
}: DataTableProps<TData, TValue>) {
	const table = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getExpandedRowModel: getRowCanExpand ? getExpandedRowModel() : undefined,
		getRowCanExpand,
	});

	if (isLoading) {
		return (
			<div className="space-y-2">
				<Skeleton className="h-12 w-full" />
				<Skeleton className="h-12 w-full" />
				<Skeleton className="h-12 w-full" />
			</div>
		);
	}

	if (data.length === 0) {
		return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
	}

	return (
		<div className="rounded-md border">
			<Table>
				<TableHeader>
					{table.getHeaderGroups().map((headerGroup) => (
						<TableRow key={headerGroup.id}>
							{headerGroup.headers.map((header) => (
								<TableHead
									key={header.id}
									style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
								>
									{header.isPlaceholder
										? null
										: flexRender(header.column.columnDef.header, header.getContext())}
								</TableHead>
							))}
						</TableRow>
					))}
				</TableHeader>
				<TableBody>
					{table.getRowModel().rows.map((row) => (
						<>
							<TableRow key={row.id}>
								{row.getVisibleCells().map((cell) => (
									<TableCell key={cell.id}>
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</TableCell>
								))}
							</TableRow>
							{row.getIsExpanded() && renderExpandedRow && (
								<TableRow key={`${row.id}-expanded`} className="bg-muted/30 hover:bg-muted/30">
									<TableCell colSpan={row.getVisibleCells().length}>
										{renderExpandedRow(row)}
									</TableCell>
								</TableRow>
							)}
						</>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
