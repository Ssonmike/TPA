"use server"

import { prisma } from "@/lib/db";

export async function getCandidateOrdersAction(laneId: string, shipDate: Date) {
    // Logic: Find orders with status 'CALCULATED' (or REQ)
    // Matching Lane
    // Matching ShipDate? Or just Lane?
    // User requirement: "mismo lane/shipDate/type"
    // We'll filter strictly.

    // Prisma Date filter might be tricky with TZ.
    // Try to match day range or exact if we store exact date.
    // Seed uses exact date objects.

    const start = new Date(shipDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(shipDate);
    end.setHours(23, 59, 59, 999);

    const orders = await prisma.salesOrder.findMany({
        where: {
            laneId: laneId,
            requestedShippingDate: {
                gte: start,
                lte: end
            },
            status: { in: ['CALCULATED', 'PALLET_CALC_REQUESTED'] }, // Candidates
            tpaGroupId: null // Not in another group
        }
    });

    return orders.map(o => ({
        ...o,
        loadingMeters: Number(o.loadingMeters),
        volumeM3: Number(o.volumeM3)
    }));
}
