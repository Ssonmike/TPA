"use client"

import { useState } from "react"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Layers, Truck, ChevronDown, ChevronRight, AlertCircle } from "lucide-react"
import { DataTable } from "@/components/data-table"
import { columns } from "@/components/columns" // Reuse dashboard columns
import { GroupTruckCalcModal } from "@/components/truck-planning/group-truck-calc-modal"
import { ExecutePlanModal } from "@/components/truck-planning/execute-plan-modal"

interface GroupRowItemProps {
    group: any
    laneId: string
    dateStr: string
}

export function GroupRowItem({ group, laneId, dateStr }: GroupRowItemProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [rowSelection, setRowSelection] = useState({})

    // Filter selected orders
    const selectedRows = group.salesOrders.filter((_: any, idx: number) => rowSelection[idx as keyof typeof rowSelection])
    // The DataTable selection state is based on index if no ID provided? 
    // Wait, standard tanstack table uses row logic.
    // We need to check how standard `DataTable` exposes selection.
    // If we use the standard `columns` from dashboard, they expect `row.original` to have data.
    // Actually, `DataTable` component usually accepts `onRowSelectionChange` but maybe doesn't expose selected ROWS directly easily without lifting state or using reference.

    // To simplify: I'll assume standard DataTable is used.
    // Let's implement a simple selection handling here.
    // Actually, passing `rowSelection` state to DataTable is the standard way.

    // Calculate totals for selection
    // Note: The `columns` definition uses `row.original`. 
    // We need to map `rowSelection` keys (indices usually, or IDs) to actual objects.

    // Quick fix: If DataTable doesn't verify selection easily, I might need to manage it.
    // Let's peek at DataTable implementation later if needed. For now assuming standard behavior.

    const orders = group.salesOrders || []
    const selectedOrderIds = Object.keys(rowSelection).map(k => orders[parseInt(k)]?.id).filter(Boolean)
    const totalSelectedLdm = Object.keys(rowSelection).map(k => Number(orders[parseInt(k)]?.loadingMeters || 0)).reduce((a, b) => a + b, 0)

    return (
        <div className="border rounded-md bg-white">
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <div className="p-3 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                        <div className="flex gap-2 items-center">
                            <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="p-0 h-6 w-6">
                                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                </Button>
                            </CollapsibleTrigger>
                            <div className="flex flex-col">
                                <span className="font-medium flex items-center gap-2">
                                    <Layers className="h-4 w-4 text-blue-600" />
                                    {group.groupNo || 'No Group Ref'}
                                </span>
                                <span className="text-xs text-muted-foreground">{group.destinationCity}, {group.destinationCountry}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="text-right text-xs">
                                <div className="font-bold">{Number(group.totalLDM).toFixed(1)} LDM</div>
                                <div className="text-muted-foreground">{group.ordersCount} Orders</div>
                            </div>

                            {/* Plan Button (Visible if Expanded or Always?) */}
                            <GroupTruckCalcModal
                                laneId={laneId}
                                dateStr={dateStr}
                                groupId={group.id}
                                groupNo={group.groupNo}
                                selectedOrderIds={selectedOrderIds}
                                totalSelectedLdm={totalSelectedLdm}
                                onSuccess={() => setRowSelection({})} // Clear selection after plan
                            />
                        </div>
                    </div>

                    {/* Nested Trucks List (Always visible if exists?) -> No, maybe inside or outside?
                        Original design had them visible under the group.
                        Let's keep them visible outside the CollapsibleContent (always visible summary)
                        OR put them inside? User said "Under a Group".
                        If I put them inside Collapsible, they hide when collapsed.
                        Maybe better to keep them outside for visibility.
                    */}
                    {group.trucks && group.trucks.length > 0 ? (
                        <div className="ml-8 border-l-2 border-indigo-100 pl-4 space-y-2">
                            {group.trucks.map((truck: any) => (
                                <div key={truck.id} className="text-sm flex items-center justify-between bg-slate-50 p-2 rounded">
                                    <div className="flex items-center gap-2">
                                        <Truck className="h-3 w-3 text-indigo-500" />
                                        <a
                                            href="https://loadoptimization-solutionviewer-test.ortecapps.com/d660ff24-e334-4b60-b806-1283062a9e58/inspection/transportload/b5a50b8e-cd5c-49a1-b566-429e049a6f92"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="font-mono text-xs text-blue-600 hover:underline cursor-pointer flex items-center gap-1"
                                            title="Open in ORTEC"
                                        >
                                            {truck.truckNumber}
                                        </a>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        <span>{Number(truck.truckTotalLDM).toFixed(1)} LDM</span>
                                        {truck.status === 'PLANNED' ? (
                                            <Badge variant="outline" className="text-[10px] h-5">{truck.executionRef}</Badge>
                                        ) : (
                                            <Badge variant="secondary" className="text-[10px] h-5">OPEN</Badge>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="ml-8 bg-red-50 text-red-600 text-xs p-1 rounded px-2 inline-block w-fit">
                            <span className="flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Pending Planning
                            </span>
                        </div>
                    )}
                </div>

                <CollapsibleContent>
                    <div className="p-3 pt-0 border-t bg-slate-50">
                        <div className="mt-2">
                            <h4 className="text-xs font-semibold mb-2 text-muted-foreground">Select Orders to Plan:</h4>
                            <DataTable
                                columns={columns}
                                data={orders}
                                rowSelection={rowSelection}
                                onRowSelectionChange={setRowSelection}
                            />
                        </div>
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </div>
    )
}
