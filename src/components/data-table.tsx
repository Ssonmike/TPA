"use client"

import * as React from "react"
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
    getPaginationRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    ColumnFiltersState,
    SortingState,
    VisibilityState,
    ExpandedState,
    getExpandedRowModel,
} from "@tanstack/react-table"
import { useState } from "react"
import { DataTableToolbar } from "@/components/data-table-toolbar"

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

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    defaultExpanded?: boolean
    rowSelection?: Record<string, boolean>
    onRowSelectionChange?: (selection: Record<string, boolean>) => void
}


export function DataTable<TData, TValue>({
    columns,
    data,
    defaultExpanded = false,
    rowSelection: externalRowSelection,
    onRowSelectionChange: externalOnRowSelectionChange
}: DataTableProps<TData, TValue>) {
    const [sorting, setSorting] = useState<SortingState>([])
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
    const [internalRowSelection, setInternalRowSelection] = useState({})
    const [expanded, setExpanded] = useState<ExpandedState>(defaultExpanded ? true : {})

    // Use external state if provided, otherwise internal
    const rowSelection = externalRowSelection ?? internalRowSelection
    const setRowSelection = externalOnRowSelectionChange ?? setInternalRowSelection

    const table = useReactTable({
        data,
        columns,
        // Enable Selection
        enableRowSelection: true,
        onRowSelectionChange: setRowSelection,

        // Expansion
        enableExpanding: true,
        getSubRows: (row: any) => row.subRows,
        initialState: {
            pagination: {
                pageSize: 20
            }
        },

        // Resizing & Reordering removed

        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getExpandedRowModel: getExpandedRowModel(),
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onExpandedChange: setExpanded,
        onRowSelectionChange: setRowSelection as any,
        state: {
            sorting,
            columnFilters,
            rowSelection,
            expanded,
        },
    })

    return (
        <div className="space-y-4">
            <DataTableToolbar table={table} />
            <div className="rounded-md border bg-white overflow-hidden">
                <Table>
                    <TableHeader className="bg-gray-100">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} className="h-8">
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead
                                            key={header.id}
                                            colSpan={header.colSpan}
                                            className="text-xs font-bold text-gray-700 py-1 h-8 select-none group"
                                        >
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
                        {/* Row 2: Filters */}
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id + '-filter'} className="h-10 bg-gray-50 border-b border-gray-200">
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id} className="p-1 align-middle">
                                            {header.column.getCanFilter() ? (
                                                <Input
                                                    className="h-7 text-[10px] bg-white border-gray-300"
                                                    placeholder="Filter..."
                                                    value={(header.column.getFilterValue() as string) ?? ""}
                                                    onChange={(event) =>
                                                        header.column.setFilterValue(event.target.value)
                                                    }
                                                />
                                            ) : null}
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
                                    className={`text-xs py-0 h-8 ${
                                        // @ts-ignore
                                        row.original.isGroupHeader ? "bg-blue-50 hover:bg-blue-100 font-semibold" : "hover:bg-gray-50"
                                        }`}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} className="py-1 px-2 text-[10px]">
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
                <div className="flex items-center justify-end space-x-2 py-2 px-4 border-t">
                    <div className="flex-1 text-xs text-muted-foreground">
                        {table.getFilteredSelectedRowModel().rows.length} of{" "}
                        {table.getFilteredRowModel().rows.length} row(s) selected.
                    </div>
                    <div className="space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                            className="h-7 text-xs"
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                            className="h-7 text-xs"
                        >
                            Next
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
