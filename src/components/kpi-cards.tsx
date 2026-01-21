import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, Layers, Package, ShieldAlert, ClipboardList, Archive } from "lucide-react";
import Link from "next/link";

export interface KpiStats {
    direct: { orders: number; pallets: number; pieces: number };
    groupage: { orders: number; pallets: number; pieces: number };
    parcels: { orders: number; pieces: number };
    blocked: { orders: number };
    openWorkload: { orders: number };
    capacity: { remaining: number; total: number };
}

export function KpiCards({ stats }: { stats: KpiStats }) {
    if (!stats || !stats.direct) return null; // Guard against initial undefined state or bad fetch
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">


            <Link href="/direct" className="block">
                <Card className="hover:bg-slate-50 transition-colors cursor-pointer">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Direct</CardTitle>
                        <Truck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.direct.orders}</div>
                        <p className="text-xs text-muted-foreground">
                            Orders: {stats.direct.orders} | Pal: {stats.direct.pallets} | Pcs: {stats.direct.pieces}
                        </p>
                    </CardContent>
                </Card>
            </Link>
            <Link href="/groupage" className="block">
                <Card className="hover:bg-slate-50 transition-colors cursor-pointer">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Groupage</CardTitle>
                        <Layers className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.groupage.orders}</div>
                        <p className="text-xs text-muted-foreground">
                            Orders: {stats.groupage.orders} | Pal: {stats.groupage.pallets} | Pcs: {stats.groupage.pieces}
                        </p>
                    </CardContent>
                </Card>
            </Link>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Parcels</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.parcels.orders}</div>
                    <p className="text-xs text-muted-foreground">
                        Orders: {stats.parcels.orders} | Pcs: {stats.parcels.pieces}
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Blocked</CardTitle>
                    <ShieldAlert className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-red-500">{stats.blocked.orders}</div>
                    <p className="text-xs text-muted-foreground">Manual Check Required</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Open Workload</CardTitle>
                    <ClipboardList className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.openWorkload.orders}</div>
                    <p className="text-xs text-muted-foreground">Total Open Orders</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Capacity</CardTitle>
                    <Archive className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-blue-500">{stats.capacity.remaining}</div>
                    <p className="text-xs text-muted-foreground">
                        / {stats.capacity.total} Daily Capacity
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
