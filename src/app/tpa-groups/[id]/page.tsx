import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { columns } from "@/components/columns"; // Reuse dashboard/orders columns? They might have extra stuff.
// Actually, specific columns for this view might be better to include "Remove" button.
// But we can just use the standard columns and maybe add a "Remove" action via a separate small component passed to DataTable if it supported generic actions, 
// OR we define a local columns definition. 
// For speed, let's copy/inline a simple definition or reuse 'groupColumns' for the group list? No this is orders.
// We'll reuse 'columns' but we need to know if we can Remove.

// We will fetch orders and render them.
import { Trash2, Plus, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AddOrderDialog } from "./add-order-dialog"; // need to create or stub
import { RemoveOrderButton } from "./remove-order-button"; // need to create

export default async function TPAGroupDetailPage({ params }: { params: { id: string } }) {
    const group = await prisma.tPAGroup.findUnique({
        where: { id: params.id },
        include: {
            salesOrders: true,
            truckGroup: true
        }
    });

    if (!group) return <div>Group not found</div>;

    const events = await prisma.eventLog.findMany({
        where: { entityId: group.id, entityType: { in: ['TPAGroup', 'GROUPING'] } }, // Check logic
        orderBy: { createdAt: 'desc' },
        take: 10
    });

    const isEditable = group.status !== 'PLANNED' && group.status !== 'CANCELLED';

    // Simple Order List just for this view
    // We can reuse the main columns but maybe strip the selection/reason if irrelevant
    // Or just Map it manually for MVP clarity

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/tpa-groups">
                        <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
                    </Link>
                    <h2 className="text-3xl font-bold tracking-tight">Group {group.groupNo}</h2>
                    <Badge variant={group.status === 'PLANNED' ? 'default' : 'secondary'}>{group.status}</Badge>
                </div>
                {isEditable && (
                    <AddOrderDialog groupId={group.id} laneId={group.laneId || ''} shipDate={group.shipDate!} />
                )}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ordering</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{group.ordersCount}</div>
                        <p className="text-xs text-muted-foreground">Sales Orders</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Volume</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{Number(group.totalLDM).toFixed(1)} LDM</div>
                        <p className="text-xs text-muted-foreground">{Number(group.totalPallets)} Pallets</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Logistics</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-md font-bold">{group.shipDate?.toLocaleDateString()}</div>
                        <p className="text-xs text-muted-foreground">Ship Date</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Assignment</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-md font-bold">{group.truckGroup?.truckNumber || 'No Truck'}</div>
                        <p className="text-xs text-muted-foreground">Truck</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Assigned Orders</CardTitle>
                </CardHeader>
                <CardContent>
                    {/* Custom Table Layout for speed/simplicity or reuse DataTable */}
                    <div className="relative w-full overflow-auto">
                        <table className="w-full caption-bottom text-sm text-left">
                            <thead className="[&_tr]:border-b">
                                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Order No</th>
                                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Ref</th>
                                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">LDM</th>
                                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">Pallets</th>
                                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="[&_tr:last-child]:border-0">
                                {group.salesOrders.map((order: any) => (
                                    <tr key={order.id} className="border-b transition-colors hover:bg-muted/50">
                                        <td className="p-4 align-middle font-medium">{order.orderNumber}</td>
                                        <td className="p-4 align-middle">{order.sapSalesOrderNumber}</td>
                                        <td className="p-4 align-middle text-right">{Number(order.loadingMeters).toFixed(1)}</td>
                                        <td className="p-4 align-middle text-right">{Number(order.pallets)}</td>
                                        <td className="p-4 align-middle text-right">
                                            {isEditable && <RemoveOrderButton groupId={group.id} orderId={order.id} />}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
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
