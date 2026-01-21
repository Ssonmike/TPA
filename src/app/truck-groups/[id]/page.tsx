import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, RotateCcw, Play } from "lucide-react";
import Link from "next/link";
import { recalcTruckAction } from "./actions";

export default async function TruckDetailPage({ params }: { params: { id: string } }) {
    const truck = await prisma.truckGroup.findUnique({
        where: { id: params.id },
        include: {
            tpaGroups: {
                include: { salesOrders: true } // Nested orders
            }
        }
    });

    if (!truck) return <div>Truck not found</div>;

    const events = await prisma.eventLog.findMany({
        where: { entityId: truck.id }, // Logged as TRUCK usually
        orderBy: { createdAt: 'desc' },
        take: 10
    });

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/truck-groups">
                        <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
                    </Link>
                    <h2 className="text-3xl font-bold tracking-tight">Truck {truck.truckNumber}</h2>
                    <Badge variant={truck.status === 'PLANNED' ? 'default' : 'secondary'}>{truck.status}</Badge>
                </div>
                <div className="flex gap-2">
                    {/* Recalc Debug */}
                    <form action={async () => {
                        "use server"
                        const { recalcTruckAction } = await import("./actions");
                        await recalcTruckAction(truck.id);
                    }}>
                        <Button variant="outline" size="sm">
                            <RefreshCw className="mr-2 h-4 w-4" /> Recalc (Debug)
                        </Button>
                    </form>

                    {/* Unplan Action - Reuse logic or simple form */}
                    {truck.status === 'PLANNED' && (
                        <form action={async () => {
                            "use server"
                            const { unplanTruckAction } = await import("@/app/planning/actions");
                            await unplanTruckAction(truck.id);
                        }}>
                            <Button variant="destructive" size="sm">
                                <RotateCcw className="mr-2 h-4 w-4" /> Unplan
                            </Button>
                        </form>
                    )}

                    {/* Plan Action (If Open) - Reuse execute logic? 
                        Execute Plan is usually Lane-wide. 
                        Button "Plan" for single truck implies "Move Status to Planned".
                        If user just wants to mark THIS truck as Planned:
                        We can support that manually or rely on Lane Execute.
                        Let's reuse executing Planning for the lane might be overkill.
                        Technically, just updating status to PLANNED works for MVP.
                        Let's call generic update or specific action.
                     */}

                    {truck.status === 'OPEN' && (
                        // Note: Proper logic is PlanningService.executePlan... but that is bulk.
                        // Maybe we need planSingleTruck? 
                        // For now, let's keep it simple or omitted if typically done via Lane.
                        // User asked "Plan (si OPEN)". 
                        // I will modify PlanningService to allow single truck plan or just update here if safe.
                        <Button variant="default" size="sm" disabled title="Use Lane Execute">
                            <Play className="mr-2 h-4 w-4" /> Plan (Use Lane Execute)
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Capacity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{Number(truck.truckTotalLDM).toFixed(1)} / {Number(truck.maxLdm)}</div>
                        <p className="text-xs text-muted-foreground">LDM Usage</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Content</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{truck.tpaGroups.length} Groups</div>
                        <p className="text-xs text-muted-foreground">{truck.ordersCount} Orders</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Lane</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-md font-bold">{truck.laneId}</div>
                        {/* fetch lane name if needed */}
                        <p className="text-xs text-muted-foreground">Lane ID</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Shipping</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-md font-bold">{truck.shipDate?.toLocaleDateString()}</div>
                        <p className="text-xs text-muted-foreground">Ship Date</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Groups & Orders</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-auto border rounded-md">
                        {truck.tpaGroups.map(group => (
                            <div key={group.id} className="border-b last:border-0">
                                <div className="bg-muted/50 p-2 flex justify-between items-center font-medium text-sm">
                                    <span>Group: <Link href={`/tpa-groups/${group.id}`} className="hover:underline text-blue-600">{group.groupNo}</Link></span>
                                    <span className="text-xs text-muted-foreground">
                                        LDM: {Number(group.totalLDM).toFixed(1)} | Pallets: {Number(group.totalPallets)}
                                    </span>
                                </div>
                                <div className="p-2 pl-6">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="text-left text-muted-foreground">
                                                <th className="pb-1">Order No</th>
                                                <th className="pb-1">Ref</th>
                                                <th className="pb-1 text-right">LDM</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {group.salesOrders.map(o => (
                                                <tr key={o.id}>
                                                    <td className="py-1">{o.orderNumber}</td>
                                                    <td className="py-1">{o.sapSalesOrderNumber}</td>
                                                    <td className="py-1 text-right">{Number(o.loadingMeters).toFixed(1)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>History</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {events.map((e: any) => (
                            <div key={e.id} className="flex gap-4 text-sm border-b pb-2">
                                <span className="text-muted-foreground min-w-[150px]">{e.createdAt.toLocaleString()}</span>
                                <Badge variant="outline">{e.eventType}</Badge>
                                <span className="text-xs truncate font-mono">{JSON.stringify(e.payload)}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
