import {
    PrismaClient, TruckGroupStatus, TPAGroupStatus, SalesOrderStatus
} from '@prisma/client';
import { prisma } from '@/lib/db';
import { EventLogService } from './event-log.service';
import { ClassificationService } from './classification.service';

export class PlanningService {

    /**
     * Execute / Plan Action
     * Scope: Lane + ShipDate
     * Transitions Status to PLANNED for Trucks, Groups, Orders
     */
    static async executePlan(laneId: string, shipDate: Date) {
        // 1. Find Open Trucks for this Lane/Date
        // (Assuming "OPEN" trucks contain the "TRUCKED" items we want to confirm)
        const trucks = await prisma.truckGroup.findMany({
            where: {
                laneId,
                shipDate,
                status: TruckGroupStatus.OPEN
            },
            include: { tpaGroups: true }
        });

        if (trucks.length === 0) return { count: 0 };

        const truckIds = trucks.map(t => t.id);

        // 2. Update Trucks -> PLANNED
        await prisma.truckGroup.updateMany({
            where: { id: { in: truckIds } },
            data: { status: TruckGroupStatus.PLANNED }
        });

        // 3. Update Groups -> PLANNED
        // Find groups in these trucks
        await prisma.tPAGroup.updateMany({
            where: { truckGroupId: { in: truckIds } },
            data: { status: TPAGroupStatus.PLANNED }
        });

        // 4. Update Orders -> PLANNED
        // Find orders in these groups (via existing relations or truckId directly)
        await prisma.salesOrder.updateMany({
            where: { truckGroupId: { in: truckIds } },
            data: { status: SalesOrderStatus.PLANNED }
        });

        // 5. Log
        await EventLogService.log('PLANNING', laneId, 'PLAN_EXECUTED', {
            trucksCount: trucks.length,
            ids: truckIds
        });

        return { count: trucks.length };
    }

    /**
     * Unplan Truck
     * Reverts Truck: PLANNED -> OPEN
     * Reverts Items: PLANNED -> TRUCKED
     */
    static async unplanTruck(truckId: string) {
        const truck = await prisma.truckGroup.findUnique({ where: { id: truckId } });
        if (!truck) throw new Error("Truck not found");

        if (truck.status !== TruckGroupStatus.PLANNED) {
            throw new Error("Truck is not PLANNED");
        }

        // 1. Revert Truck
        await prisma.truckGroup.update({
            where: { id: truckId },
            data: { status: TruckGroupStatus.OPEN }
        });

        // 2. Revert Groups
        await prisma.tPAGroup.updateMany({
            where: { truckGroupId: truckId },
            data: { status: TPAGroupStatus.TRUCKED } // Back to "Just sitting in a truck"
        });

        // 3. Revert Orders
        await prisma.salesOrder.updateMany({
            where: { truckGroupId: truckId },
            data: { status: SalesOrderStatus.TRUCKED }
        });

        await EventLogService.log('PLANNING', truckId, 'TRUCK_UNPLANNED', {});
    }

    /**
     * Cancel Group
     * Mark Group CANCELLED
     * Release Orders -> OPEN (and re-evaluate?)
     */
    static async cancelGroup(groupId: string) {
        const group = await prisma.tPAGroup.findUnique({
            where: { id: groupId },
            include: { salesOrders: true }
        });

        if (!group) throw new Error("Group not found");

        // Block if PLANNED? 
        // User said: "bloquea acciones... salvo Unplan".
        // Cancel logic usually requires Unplan first if it's deeply nested?
        // Let's assume we can only cancel if NOT PLANNED.
        if (group.status === TPAGroupStatus.PLANNED) {
            throw new Error("Cannot cancel PLANNED group. Unplan truck first.");
        }

        // 1. Mark Group Cancelled
        // Disconnect orders? If we keep relation for history, we can't reusing orders easily if uniqueness on order.
        // User: "Desasigna orders de ese group (tpaGroupId null)"

        await prisma.tPAGroup.update({
            where: { id: groupId },
            data: {
                status: TPAGroupStatus.CANCELLED,
                // total metrics? keep them for record of what was cancelled?
            }
        });

        const orderIds = group.salesOrders.map(o => o.id);

        // 2. Release Orders
        // "OPEN + re-evaluate automático"
        await prisma.salesOrder.updateMany({
            where: { id: { in: orderIds } },
            data: {
                status: SalesOrderStatus.OPEN,
                tpaGroupId: null,
                truckGroupId: null
            }
        });

        // 3. Re-evaluate
        // Re-run classification to ensure they are valid OPEN orders?
        // Or just leave them OPEN.
        // Prompt: "OPEN + re-evaluate automático (preferido)"
        for (const oid of orderIds) {
            await ClassificationService.classifyOrder(oid);
        }

        await EventLogService.log('PLANNING', groupId, 'GROUP_CANCELLED', { ordersReleased: orderIds.length });
    }

    /**
     * Plan Parcel
     * Direct transition to PLANNED for validated Parcel orders
     */
    static async planParcel(orderIds: string[]) {
        // Filter only valid Parcel orders? 
        // Assume inputs are valid for now or filter
        const res = await prisma.salesOrder.updateMany({
            where: {
                id: { in: orderIds },
                shippingType: 'PARCEL',
                status: SalesOrderStatus.CALCULATED // Or OPEN/REQ? Usually calculated first.
            },
            data: { status: SalesOrderStatus.PLANNED }
        });

        await EventLogService.log('PLANNING', 'BATCH', 'PARCEL_PLANNED', { count: res.count });
        return res.count;
    }

    /**
     * Plan Direct
     * Groups by ShipTo+Date -> PLANNED Group -> PLANNED Order
     */
    static async planDirect(orderIds: string[]) {
        const orders = await prisma.salesOrder.findMany({
            where: {
                id: { in: orderIds },
                // shippingType: { in: ['DIRECT_LTL', 'DIRECT_FTL'] }, // Flexible
                status: SalesOrderStatus.CALCULATED
            }
        });

        if (orders.length === 0) return 0;

        // Group by ShipTo + Date
        const buckets = new Map<string, typeof orders>(); // key: shipto|date

        for (const o of orders) {
            const key = `${o.shipToAddress}|${o.requestedShippingDate.toISOString().split('T')[0]}`;
            if (!buckets.has(key)) buckets.set(key, []);
            buckets.get(key)!.push(o);
        }

        let total = 0;

        for (const [key, bucketOrders] of buckets) {
            const first = bucketOrders[0];
            // Upsert Group
            // Note: Direct groups are unique by [shipToId, shipDate, shipmentType]?
            // Schema allows unique on groupNo or similar.
            // We'll search and create.

            let group = await prisma.tPAGroup.findFirst({
                where: {
                    shipToId: first.shipToAddress,
                    shipDate: first.requestedShippingDate,
                    // shippingType: first.shippingType // Could differ LTL/FTL in same group? Maybe. 
                    // Let's assume matches first.
                }
            });

            if (!group) {
                group = await prisma.tPAGroup.create({
                    data: {
                        shipToId: first.shipToAddress,
                        shipDate: first.requestedShippingDate,
                        shippingType: first.shippingType,
                        status: TPAGroupStatus.PLANNED, // Direct to PLANNED for MVP
                        groupNo: `DIR-${first.shipToAddress}-${Date.now()}`
                    }
                });
            } else {
                // Update status if needed (e.g. was OPEN)
                if (group.status !== TPAGroupStatus.PLANNED) {
                    await prisma.tPAGroup.update({ where: { id: group.id }, data: { status: TPAGroupStatus.PLANNED } });
                }
            }

            // Assign Orders
            await prisma.salesOrder.updateMany({
                where: { id: { in: bucketOrders.map(o => o.id) } },
                data: {
                    tpaGroupId: group.id,
                    status: SalesOrderStatus.PLANNED
                }
            });

            // Recalc Totals helper (reused from GroupingService ideally, but quick inline or ignore for MVP)
            // ...

            total += bucketOrders.length;
        }

        await EventLogService.log('PLANNING', 'BATCH', 'DIRECT_PLANNED', { count: total });
        return total;
    }

    /**
     * Generic Unplan for Orders (Parcel/Direct)
     * Revert to CALCULATED
     */
    static async unplanOrders(orderIds: string[]) {
        // Handle Direct Groups? 
        // If order belongs to Direct Group, do we remove it?
        // Simpler for MVP: Just detach and set CALCULATED. 
        // Clean up empty groups later or ignore.

        await prisma.salesOrder.updateMany({
            where: { id: { in: orderIds } },
            data: {
                status: SalesOrderStatus.CALCULATED,
                truckGroupId: null, // Just in case
                tpaGroupId: null // Detach from Direct group
            }
        });

        await EventLogService.log('PLANNING', 'BATCH', 'ORDER_UNPLANNED', { count: orderIds.length });
    }
}
