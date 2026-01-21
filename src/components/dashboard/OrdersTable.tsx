'use client';

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { SalesOrder, SalesOrderStatus, TPAGroup } from '@prisma/client';
import { useRouter } from 'next/navigation';

interface OrdersTableProps {
    initialOrders: (SalesOrder & { tpaGroup?: TPAGroup | null })[];
}

export function OrdersTable({ initialOrders }: OrdersTableProps) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('OPEN');

    // Client-side filtering for MVP (Server-side ideal for large datasets)
    // We accepted initialOrders (limit 50). Using tabs on specific limited set or refetching?
    // Ideally, clicking tab should fetch new data or filter.
    // We'll filter the initial prop for now, assuming server sends mixed or we fetch.
    // Actually, page.tsx fetched "All" for stats, but "take: 50" for table sorted by date.
    // The table likely contains mostly OPEN orders if sorted by priority/date?
    // Let's implement client filtering on the passed data effectively.

    const filtered = initialOrders.filter(o => {
        if (activeTab === 'ALL') return true;
        return o.status === activeTab;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'OPEN': return 'bg-blue-100 text-blue-800';
            case 'ON_HOLD': return 'bg-red-100 text-red-800';
            case 'GROUPED': return 'bg-orange-100 text-orange-800';
            case 'PLANNED': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="p-4">
            <Tabs defaultValue="OPEN" onValueChange={setActiveTab}>
                <div className="flex justify-between mb-4">
                    <TabsList>
                        <TabsTrigger value="OPEN">Open Workload</TabsTrigger>
                        <TabsTrigger value="GROUPED">Grouped</TabsTrigger>
                        <TabsTrigger value="PLANNED">Planned</TabsTrigger>
                        <TabsTrigger value="ON_HOLD">Blocked</TabsTrigger>
                        <TabsTrigger value="ALL">All</TabsTrigger>
                    </TabsList>

                    <div className="flex gap-2">
                        {/* Filter inputs could go here */}
                    </div>
                </div>

                <TabsContent value={activeTab} className="mt-0">
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>SAP Ref</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Dest</TableHead>
                                    <TableHead>Product</TableHead>
                                    <TableHead className="text-right">Vol (m³)</TableHead>
                                    <TableHead className="text-right">LDM</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Group</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={11} className="h-24 text-center">
                                            No orders found in this view.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {filtered.map((order) => (
                                    <TableRow key={order.id}>
                                        <TableCell className="font-medium">
                                            {new Date(order.requestedShippingDate).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>{order.sapSalesOrderNumber}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold">{order.customerId}</span>
                                                <span className="text-xs text-gray-500">{order.shipToName || order.shipToAddress}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {order.country}-{order.zipCode} {order.city}
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-xs text-gray-500">{order.cartonQuantity} pcs</span>
                                        </TableCell>
                                        <TableCell className="text-right">{Number(order.volumeM3).toFixed(2)}</TableCell>
                                        <TableCell className="text-right">{Number(order.loadingMeters).toFixed(2)}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{order.shippingType}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={getStatusColor(order.status)} variant="secondary">
                                                {order.status}
                                            </Badge>
                                            {order.holdReason && (
                                                <div className="text-[10px] text-red-500 max-w-[150px] truncate" title={order.holdReason}>
                                                    {order.holdReason}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {order.tpaGroup ? (
                                                <span className="text-xs font-mono text-blue-600 cursor-pointer underline">
                                                    {order.tpaGroup.tpaReference}
                                                </span>
                                            ) : '-'}
                                        </TableCell>
                                        <TableCell>
                                            {/* Actions Dropdown */}
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <span className="sr-only">Menu</span>
                                                <span className="h-4 w-4">...</span>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>
                {/* Repeat Logic or Re-use Content for other tabs automatically handled by filtered list if we use same Table structure inside one content? 
            TabsContent forces unmount/mount. If we want shared table, put table outside TabsContent and use activeTab to filter.
            Yes, I put Table inside TabsContent. I should probably copy it or just use one Table and no TabsContent, just TabsList controlling state.
            I will use TabsList only and render Table based on state. 
            Correction: shadcn Tabs expects TabsContent. 
            I will clean this up visually. 
            Actually, just rendering the filtered list inside specific TabsContent value={activeTab} implies I need to duplicate code or mapped?
            Better: Use Tabs just for UI control, and render below.
        */}
            </Tabs>
        </div>
    );
}
