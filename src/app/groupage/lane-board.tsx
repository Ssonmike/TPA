"use client"

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { DataTable } from "@/components/data-table"
import { groupColumns } from "@/app/tpa-groups/columns" // Reuse group columns for consistency
import { DailyBucket, LaneData } from "@/services/lane.service" // Type import (if client allowed)
import { Truck, Box, Layers, AlertCircle, Link } from "lucide-react"
import { TruckCalcModal } from "@/components/truck-planning/truck-calc-modal"
import { ExecutePlanModal } from "@/components/truck-planning/execute-plan-modal"
import { GroupRowItem } from "./group-row-item"

// If we can't import type from service in client (sometimes issues), define here or use any.
// Assuming we pass data as props.

export function LaneBoard({ laneData }: { laneData: any[] }) {

    return (
        <div className="space-y-6">
            {laneData.map((lane: any) => (
                <Card key={lane.laneId}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex justify-between">
                            <span>{lane.laneName}</span>
                            <Badge variant="outline">{lane.buckets.length} Active Days</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Accordion type="single" collapsible className="w-full">
                            {lane.buckets.map((bucket: any, idx: number) => (
                                <AccordionItem key={bucket.dateStr} value={`item-${idx}`}>
                                    <AccordionTrigger className="hover:no-underline">
                                        <div className="flex flex-1 items-center justify-between mr-4">
                                            <div className="flex items-center gap-4">
                                                <span className="font-mono font-bold">{bucket.dateStr}</span>
                                                <div className="flex gap-2 text-xs text-muted-foreground">
                                                    <Badge variant="secondary">{bucket.groups.length} Groups</Badge>
                                                    <Badge variant="secondary">{bucket.trucks.length} Trucks</Badge>
                                                </div>
                                            </div>
                                            <div className="flex gap-4 text-sm">
                                                <span><span className="font-bold">{bucket.metrics.totalLDM.toFixed(1)}</span> LDM</span>
                                                <span><span className="font-bold">{bucket.metrics.ordersCount}</span> Ords</span>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <div className="py-4 space-y-4">
                                            <div className="flex justify-end gap-2 bg-slate-50 p-2 rounded-md">
                                                <TruckCalcModal
                                                    laneId={lane.laneId}
                                                    laneName={lane.laneName}
                                                    dateStr={bucket.dateStr}
                                                    workload={{
                                                        ldm: bucket.metrics.totalLDM,
                                                        orders: bucket.metrics.ordersCount,
                                                        groups: bucket.groups.length
                                                    }}
                                                />


                                            </div>

                                            {/* Groups Hierarchy */}
                                            <div className="space-y-2">
                                                <h4 className="text-sm font-semibold mb-2">Groups & Trucks</h4>
                                                {bucket.groups.map((group: any) => (
                                                    <GroupRowItem
                                                        key={group.id}
                                                        group={group}
                                                        laneId={lane.laneId}
                                                        dateStr={bucket.dateStr}
                                                    />
                                                ))}
                                            </div>

                                            {/* Trucks Summary (Simple List) */}
                                            {bucket.trucks.length > 0 && (
                                                <div className="mt-4 border-t pt-4">
                                                    <h4 className="text-sm font-semibold mb-2">Planned Trucks</h4>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                        {bucket.trucks.map((t: any) => (
                                                            <div key={t.id} className="border p-2 rounded text-sm flex justify-between items-center bg-white">
                                                                <div className="flex flex-col gap-1">
                                                                    <span className="font-mono font-bold">{t.truckNumber}</span>
                                                                    {t.status === 'PLANNED' ? (
                                                                        <div className="flex gap-2 text-xs text-muted-foreground items-center">
                                                                            <Badge variant="outline" className="font-mono">{t.executionRef}</Badge>
                                                                            <span>{new Date(t.plannedPickUpDate).toLocaleDateString()} {t.loadType}</span>
                                                                        </div>
                                                                    ) : (
                                                                        <ExecutePlanModal truckId={t.id} truckNumber={t.truckNumber} />
                                                                    )}
                                                                </div>
                                                                <div className="flex gap-2 items-center">
                                                                    <span>{Number(t.truckTotalLDM).toFixed(1)} LDM</span>
                                                                    {t.truckType && t.truckType !== 'STANDARD' && (
                                                                        <Badge variant="outline" className="text-[10px] px-1 h-5">{t.truckType}</Badge>
                                                                    )}
                                                                    <Badge variant={t.status === 'PLANNED' ? 'default' : 'secondary'}>{t.status}</Badge>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                        {lane.buckets.length === 0 && <div className="text-muted-foreground text-sm italic py-4">No active groups for this lane.</div>}
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
