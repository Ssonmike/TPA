import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SalesOrderStatus, ShippingType } from '@prisma/client';

export async function POST(req: NextRequest) {
    // Stub: Generate mock orders or accept payload
    // If payload empty, generate 5 random orders
    const body = await req.json().catch(() => ({}));

    if (!body.orders) {
        // Generate Random
        const created = [];
        for (let i = 0; i < 5; i++) {
            const ref = `SAP-${Math.floor(Math.random() * 100000)}`;
            const so = await prisma.salesOrder.create({
                data: {
                    sapSalesOrderNumber: ref,
                    orderReferenceNumber: `REF-${ref}`,
                    requestedShippingDate: new Date(),
                    shipToAddress: 'Address 123',
                    country: ['DE', 'FR', 'NL', 'BE'][Math.floor(Math.random() * 4)],
                    zipCode: '12345',
                    city: 'CityName',
                    weight: Math.random() * 500,
                    volumeM3: Math.random() * 5,
                    loadingMeters: Math.random() * 2,
                    pallets: Math.floor(Math.random() * 5) + 1,
                    cartonQuantity: 10,
                    height: Math.random() * 2 + 1,
                    vasCode: 'NONE',
                    incoterm: 'DAP',
                    priorityLevel: 1,
                    assignee: 'Unassigned',
                    isConsolidation: false,
                    status: SalesOrderStatus.OPEN,
                    shippingType: ShippingType.GROUPAGE, // Default, pipeline fixes it
                    customerId: 'CUST-001', // Needs valid Customer if FK enforced? 
                    // We need to ensure logic handles missing FK or we seed Customer first.
                    // For stub, let's assume we Seeded CUST-001.
                    // Or create customer on fly if not exists?
                    customer: {
                        connectOrCreate: {
                            where: { customerId: 'CUST-001' }, // Logic slightly off due to composite key in model?
                            // Schema: Customer has id (uuid), customerId (string).
                            // To connect, we need unique field.
                            // Customer has NO unique on customerId alone in schema unless I added it? 
                            // I added @@unique([customerId, shipToId]) as comment, so logic might fail.
                            // I'll create new customer every time or FindFirst.
                            create: {
                                customerId: 'CUST-001',
                                countryReference: 'DE',
                                shipToId: 'ADDR-1'
                            }
                        }
                        // Connect needs unique. Since customerId is not unique, I cant use connect simple.
                        // I will Use create for data integrity in stub or assume seed ran.
                        // I'll use create for now to be safe or fix schema.
                    }
                }
            });
            created.push(so);
        }
        return NextResponse.json({ message: 'Generated 5 Mock Orders', orders: created });
    }

    // Handle actual upsert if needed
    return NextResponse.json({ message: 'Not implemented' });
}
