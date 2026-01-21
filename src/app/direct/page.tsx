import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DirectOrdersClient } from "./client";

export const dynamic = 'force-dynamic';

export default async function DirectOrdersPage() {
    const rawOrders = await prisma.salesOrder.findMany({
        where: {
            shippingType: { in: ['DIRECT_LTL', 'DIRECT_FTL'] },
            status: { notIn: ['OPEN', 'PLANNED', 'SHIPPED', 'CANCELLED', 'TRUCKED'] },
            isActive: true
        },
        include: {
            customer: true
        },
        orderBy: { requestedShippingDate: 'asc' }
    });

    const orders = rawOrders.map(o => ({
        ...o,
        // Cast to any to access new fields if TS types lag behind schema update
        cityInitials: (o as any).cityInitials || undefined,
        consignee: (o as any).consignee || undefined,
        deliveryInstruction: (o as any).deliveryInstruction || undefined,
        carrierName: (o as any).carrierName || undefined,
        firstPickupDate: (o as any).firstPickupDate ? new Date((o as any).firstPickupDate) : undefined,

        weight: Number(o.weight),
        volumeM3: Number(o.volumeM3),
        loadingMeters: o.loadingMeters ? Number(o.loadingMeters) : null,
        height: o.height ? Number(o.height) : undefined,
        tpaTotalLdm: o.tpaTotalLdm ? Number(o.tpaTotalLdm) : undefined,
        ldmAllocated: o.ldmAllocated ? Number(o.ldmAllocated) : undefined,
        pallets: o.pallets || 0,
        priorityLevel: o.priorityLevel || 0, // Fix null -> number

        tpaNumber: o.tpaNumber || undefined,
        tpaGroupId: o.tpaGroupId || undefined,
        zipCode: o.shipToZip || undefined,
        country: o.shipToCountry || o.country,
        shippingType: o.shippingType,
        effectiveShipmentType: o.effectiveShipmentType || undefined
    }));

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold tracking-tight">Direct Orders Planning</h1>

            <DirectOrdersClient orders={orders} />
        </div>
    )
}
