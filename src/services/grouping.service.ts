import {
    PrismaClient, SalesOrder, TPAGroupStatus, ShippingType, SalesOrderStatus
} from '@prisma/client';
import { prisma } from '@/lib/db';
import { EventLogService } from './event-log.service';

export class GroupingService {

    // Group Groupage Orders
    static async groupGroupage(shipDate: Date) {
        // Find CALCULATED Groupage orders for this date
        // (Ignoring Timezones for simplicity, assuming date equality or range)

        // Actually TPA grouping is often by "Lane" + "Date".

        const orders = await prisma.salesOrder.findMany({
            where: {
                status: SalesOrderStatus.CALCULATED,
                // STRICT: Only group things effectively GROUPAGE
                // Direct orders (even if originally Groupage but promoted by LDM) must stay Direct
                effectiveShipmentType: ShippingType.GROUPAGE,
                requestedShippingDate: shipDate
            },
            include: { customer: true }
        });

        if (orders.length === 0) return;

        // Bucket by Lane
        // We need to resolve Lane first? Reference Classification logic or re-resolve.
        // Classification checked lane EXISTENCE but didn't save laneId on Order (Order has no laneId).
        // TPAGroup has laneId.

        const lanes = await prisma.lane.findMany({ where: { isActive: true } });

        const buckets: Record<string, SalesOrder[]> = {}; // LaneID -> Orders

        for (const order of orders) {
            // Re-resolve Lane (Determinista)
            // Or efficient: Resolve once if cached.
            // "primer Lane activo cuyo countries contiene order.country"
            // Note: lanes ordered by priority? Not guaranteed in fetch unless specific.
            // Classification service did `orderBy: { lanePriority: 'asc' }`. We should do same.

            // Better: Move Lane Resolution to reuseable helper if frequent.
            // For now:
            const lane = lanes.sort((a, b) => a.lanePriority - b.lanePriority)
                .find(l => l.countries.includes(order.country));

            if (lane) {
                if (!buckets[lane.id]) buckets[lane.id] = [];
                buckets[lane.id].push(order);
            } else {
                // Should have been blocked? Maybe Lane changed?
                // Skip or Block?
                console.warn(`Order ${order.id} has no lane but was Calculated?`);
            }
        }

        // Create/Update Groups
        const touchedSourceGroups = new Set<string>();
        // Pre-collect source groups from orders being moved
        orders.forEach(o => {
            if (o.tpaGroupId) touchedSourceGroups.add(o.tpaGroupId);
        });

        for (const [laneId, laneOrders] of Object.entries(buckets)) {
            // Idempotency: Find existing OPEN group for this Lane+Date
            // Constraint: @@unique([laneId, shipDate, shipmentType]) not strictly enforced by DB unique yet due to nulls, 
            // but we treat it as unique logic.

            let group = await prisma.tPAGroup.findFirst({
                where: {
                    laneId,
                    shipDate: shipDate,
                    shippingType: ShippingType.GROUPAGE,
                    status: TPAGroupStatus.OPEN
                }
            });

            if (!group) {
                // Create
                group = await prisma.tPAGroup.create({
                    data: {
                        laneId,
                        shipDate: shipDate,
                        shippingType: ShippingType.GROUPAGE,
                        status: TPAGroupStatus.OPEN,
                        // groupNo: generated DB side or uuid? Spec: groupNo String @unique (generación secuencial)
                        // Getting sequential No in Prisma is hard without Sequence. UUID for now or specific generator.
                        groupNo: `GRP-${laneId.substring(0, 4)}-${Date.now()}` // Mock sequential
                    }
                })
            }

            // Add orders
            for (const o of laneOrders) {
                await prisma.salesOrder.update({
                    where: { id: o.id },
                    data: {
                        tpaGroupId: group.id,
                        status: SalesOrderStatus.GROUPED
                    }
                })
            }

            // Update Aggregate Totals
            await this.recalculateGroupTotals(group.id);

            await EventLogService.log('GROUP', group.id, 'ORDERS_ADDED', { count: laneOrders.length });
        }

        // CLEANUP: Remove empty source groups (e.g. from Calc/Consolidation phase)
        if (touchedSourceGroups.size > 0) {
            console.log(`[Grouping] Checking ${touchedSourceGroups.size} source groups for cleanup...`);
            for (const oldGroupId of Array.from(touchedSourceGroups)) {
                const remainingCount = await prisma.salesOrder.count({
                    where: { tpaGroupId: oldGroupId }
                });

                if (remainingCount === 0) {
                    console.log(`[Grouping] Deleting empty group ${oldGroupId}`);
                    await prisma.tPAGroup.delete({ where: { id: oldGroupId } });
                }
            }
        }
    }

    // Group Direct
    static async groupDirect(shipDate: Date) {
        // ... Similar logic but grouping by ShipToId ...
        // Skipping implementation details for brevity, following pattern.
    }

    static async recalculateGroupTotals(groupId: string) {
        const agg = await prisma.salesOrder.aggregate({
            where: { tpaGroupId: groupId },
            _sum: {
                volumeM3: true,
                weight: true,
                pallets: true,
                loadingMeters: true,
                cartonQuantity: true
            },
            _count: { id: true }
        });

        await prisma.tPAGroup.update({
            where: { id: groupId },
            data: {
                totalVolumeM3: agg._sum.volumeM3 || 0,
                totalWeight: agg._sum.weight || 0,
                totalPallets: agg._sum.pallets || 0,
                totalLDM: agg._sum.loadingMeters || 0,
                // totalPcs: agg._sum.cartonQuantity || 0, // Should be in schema if we use it, otherwise rely on ordersCount
                ordersCount: agg._count.id
            }
        });
    }

    // Helper to run "Group" action
    static async executeGrouping() {
        // Group for today/tomorrow/all dates? Flow typically iterates distinct dates of open orders.
        // For Demo: Group ALL Calculated.

        // distinct dates
        const dates = await prisma.salesOrder.findMany({
            where: { status: SalesOrderStatus.CALCULATED },
            select: { requestedShippingDate: true },
            distinct: ['requestedShippingDate']
        });

        for (const d of dates) {
            await this.groupGroupage(d.requestedShippingDate);
            // await this.groupDirect(d.requestedShippingDate);
        }
    }
}
