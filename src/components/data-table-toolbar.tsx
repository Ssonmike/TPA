"use client"

import { Table } from "@tanstack/react-table"
import { X, SlidersHorizontal, Package, Truck, PauseCircle, Play, Calculator, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { toggleHoldAction, calculateSelectedAction, planSelectedAction, groupSelectedAction, unplanSelectedAction } from "@/app/bulk-actions"
import { useState } from "react"

import { ReMixDialog } from "@/components/remix-dialog"

interface DataTableToolbarProps<TData> {
    table: Table<TData>
}

export function DataTableToolbar<TData>({
    table,
}: DataTableToolbarProps<TData>) {
    const isFiltered = table.getState().columnFilters.length > 0

    // NO FILTERING: Direct mapping as user requested
    // If user selected it, pass it to the dialog
    const selectedOrders = table.getSelectedRowModel().rows.map(row => row.original);
    const selectedCount = selectedOrders.length;

    console.log("DataTableToolbar: selectedOrders.length =", selectedOrders.length);
    console.log("DataTableToolbar: selectedOrders IDs =", selectedOrders.map((o: any) => o.id));

    const [loading, setLoading] = useState(false);

    const handleBulk = async (action: Function, ...args: any[]) => {
        setLoading(true);
        const ids = selectedOrders.map((o: any) => o.id);
        await action(ids, ...args);
        table.resetRowSelection();
        setLoading(false);
    }

    return (
        <div className="flex flax-wrap items-center justify-between">
            <div className="flex flex-1 items-center space-x-2">
                <Input
                    placeholder="Filter orders..."
                    value={(table.getColumn("orderReferenceNumber")?.getFilterValue() as string) ?? ""}
                    onChange={(event) =>
                        table.getColumn("orderReferenceNumber")?.setFilterValue(event.target.value)
                    }
                    className="h-8 w-[150px] lg:w-[250px]"
                />

                {/* Re-Mix Action: Only show if selection > 0 */}
                {selectedCount > 0 && (
                    <ReMixDialog
                        selectedOrders={selectedOrders}
                        onSuccess={() => table.resetRowSelection()}
                    />
                )}

                {/* ACTIONS MENU */}
                {selectedCount > 0 && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="default" size="sm" className="ml-2 h-8" disabled={loading}>
                                {loading ? "..." : `Actions (${selectedCount})`} <SlidersHorizontal className="ml-2 h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-[200px]">

                            <DropdownMenuItem onClick={() => handleBulk(toggleHoldAction, true)}>
                                <PauseCircle className="mr-2 h-4 w-4" /> Hold
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleBulk(toggleHoldAction, false)}>
                                <Play className="mr-2 h-4 w-4" /> Unhold
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem onClick={() => handleBulk(calculateSelectedAction)}>
                                <Calculator className="mr-2 h-4 w-4" /> Calculate
                            </DropdownMenuItem>

                            <DropdownMenuItem onClick={() => handleBulk(groupSelectedAction)}>
                                <Layers className="mr-2 h-4 w-4" /> Group Selected
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem onClick={() => handleBulk(planSelectedAction, 'PARCEL')}>
                                <Package className="mr-2 h-4 w-4" /> Plan Parcel
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleBulk(planSelectedAction, 'DIRECT')}>
                                <Truck className="mr-2 h-4 w-4" /> Plan Direct
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleBulk(unplanSelectedAction)}>
                                <RotateCcw className="mr-2 h-4 w-4" /> Unplan
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                        </DropdownMenuContent>
                    </DropdownMenu>
                )}

                {isFiltered && (
                    <Button
                        variant="ghost"
                        onClick={() => table.resetColumnFilters()}
                        className="h-8 px-2 lg:px-3"
                    >
                        Reset
                        <X className="ml-2 h-4 w-4" />
                    </Button>
                )}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="ml-2 h-8">
                            View
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[150px]">
                        {table
                            .getAllColumns()
                            .filter(
                                (column) =>
                                    typeof column.accessorFn !== "undefined" && column.getCanHide()
                            )
                            .map((column) => {
                                return (
                                    <DropdownMenuItem
                                        key={column.id}
                                        className="capitalize"
                                        onClick={() => column.toggleVisibility(!column.getIsVisible())}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={column.getIsVisible()}
                                            readOnly
                                            className="mr-2"
                                        />
                                        {column.id}
                                    </DropdownMenuItem>
                                )
                            })}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <div className="flex items-center space-x-2">
                {/* DatePicker could go here or in filters */}
            </div>
        </div>
    )
}

function Layers({ className }: { className?: string }) {
    return <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>
}
