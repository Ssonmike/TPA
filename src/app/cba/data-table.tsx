"use client"

import * as React from "react"
import {
    ColumnDef,
    ColumnFiltersState,
    SortingState,
    VisibilityState,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
    flexRender,
    getExpandedRowModel,
    RowSelectionState,
    OnChangeFn,
} from "@tanstack/react-table"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CBAOrder } from "./cba-columns"
import { cn } from "@/lib/utils"

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    rowSelection?: RowSelectionState
    onRowSelectionChange?: OnChangeFn<RowSelectionState>
    meta?: any // Weak typing to avoid circular deps or complex type mapping for now. Ideally should be TableMeta<TData> but TData needs to match.
}

export function CBADataTable<TData extends { id: string }, TValue>({
    columns,
    data,
    rowSelection: externalRowSelection,
    onRowSelectionChange: externalOnRowSelectionChange,
    meta
}: DataTableProps<TData, TValue>) {
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [expanded, setExpanded] = React.useState({})
    const [internalRowSelection, setInternalRowSelection] = React.useState({})

    const rowSelection = externalRowSelection ?? internalRowSelection
    const setRowSelection = externalOnRowSelectionChange ?? setInternalRowSelection

    const table = useReactTable({
        data,
        columns,
        getRowId: (row) => row.id,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getExpandedRowModel: getExpandedRowModel(),
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onExpandedChange: setExpanded,
        onRowSelectionChange: setRowSelection,
        // @ts-ignore
        getSubRows: (row) => row.subRows,
        state: {
            sorting,
            columnFilters,
            expanded,
            rowSelection,
        },
        meta,
        initialState: {
            pagination: { pageSize: 50 } // Show more rows by default for carrier
        }
    })

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader className="bg-slate-50">
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => {
                                return (
                                    <TableHead key={header.id}>
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                    </TableHead>
                                )
                            })}
                        </TableRow>
                    ))}
                </TableHeader>
                <TableBody>
                    {table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map((row) => (
                            <TableRow
                                key={row.id}
                                data-state={row.getIsSelected() && "selected"}
                                className={cn(
                                    // @ts-ignore
                                    row.original.isGroupHeader ? "bg-blue-50 hover:bg-blue-100 font-semibold" : "hover:bg-slate-50/50"
                                )}
                            >
                                {row.getVisibleCells().map((cell) => (
                                    <TableCell key={cell.id} className="py-2">
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={columns.length} className="h-24 text-center">
                                No results.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
            <div className="flex items-center justify-end space-x-2 py-4 px-4 border-t">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                >
                    Previous
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                >
                    Next
                </Button>
            </div>
        </div>
    )
}
