import { PrismaClient, TruckGroupStatus, TPAGroupStatus, SalesOrderStatus, TruckType } from '@prisma/client';
import { prisma } from '@/lib/db';
import { EventLogService } from './event-log.service';

export class TruckService {

    /**
     * Greedy Bin Packing of Groups into Trucks for a specific Lane & Date
     */
    /**
     * Greedy Bin Packing of Groups into Trucks for a specific Lane & Date
     * Supports optional 'selectedOrderIds' to plan specific subset (splitting).
     */
    static async calculateTruckPlanning(laneId: string, shipDate: Date, truckType: TruckType = 'STANDARD', customLdm?: number, selectedOrderIds?: string[]) {
        // 1. Resolve Constraints
        const lane = await prisma.lane.findUnique({ where: { id: laneId } });
        let maxLdm = lane ? Number(lane.maxLdm) : 13.6;

        if (truckType === 'CUSTOM' && customLdm && customLdm > 0) {
            maxLdm = customLdm;
        } else if (truckType === 'LZV') {
            maxLdm = 21.05;
        } else if (truckType === 'COMBI_1') {
            maxLdm = 14.9;
        } else if (truckType === 'COMBI_2') {
            maxLdm = 15.64;
        } else if (truckType === 'STANDARD') {
            maxLdm = 13.6;
        }

        // 2. Determine Scope & Cleanup
        let itemsToPack: { id: string, ldm: number, salesOrders: any[], tpaGroupId: string }[] = [];

        if (selectedOrderIds && selectedOrderIds.length > 0) {
            // A. Scope: Selected Orders Only
            // DO NOT Delete existing trucks (we are adding to the plan).

            const orders = await prisma.salesOrder.findMany({
                where: { id: { in: selectedOrderIds } },
                include: { tpaGroup: true } // Need group info
            });

            // Validate: All should have TPA Group?
            // Group by TPA Group ID to handle "Items"
            // Actually, if we selected orders, we treat the SUM of these orders as the "Item" to pack?
            // OR do we pack them individually?
            // Usually, if I select 5 orders from Group A, I want them to go into a truck together if they fit.
            // If they don't fit, split THE SELECTION.

            // We can treat the connection of these orders as ONE item to start, or multiple?
            // The Bin Packing algorithm in L70 works on "Groups". We can adapt it.
            // Let's create a virtual "Item" representing the Selection.

            const totalSelectionLdm = orders.reduce((sum, o) => sum + Number(o.loadingMeters || 0), 0);

            // We assume they all belong to the SAME group if user selected from a Group row.
            // But we can handle mixed selection if needed. 
            // For now, let's assume one virtual item per TPA Group involved.

            const groupsMap = new Map<string, typeof orders>();
            orders.forEach(o => {
                const gid = o.tpaGroupId || 'ungrouped';
                if (!groupsMap.has(gid)) groupsMap.set(gid, []);
                groupsMap.get(gid)!.push(o);
            });

            for (const [gid, grpOrders] of groupsMap.entries()) {
                const subTotal = grpOrders.reduce((sum, o) => sum + Number(o.loadingMeters || 0), 0);
                itemsToPack.push({
                    id: `selection-${gid}-${Date.now()}`,
                    ldm: subTotal,
                    salesOrders: grpOrders,
                    tpaGroupId: gid !== 'ungrouped' ? gid : ''
                });
            }

        } else {
            // B. Scope: Full Lane Plan (Default)
            // Delete all OPEN trucks for this Lane+Date to clean slate.
            await prisma.truckGroup.deleteMany({
                where: {
                    laneId: laneId,
                    shipDate: shipDate,
                    status: { not: TruckGroupStatus.PLANNED }
                }
            });

            // Fetch Groups (Aggregate Level)
            const groups = await prisma.tPAGroup.findMany({
                where: {
                    laneId,
                    shipDate,
                    status: { not: TPAGroupStatus.CANCELLED }
                },
                include: { trucks: true, salesOrders: true }, // Include orders to link them later?
                orderBy: { totalLDM: 'desc' }
            });

            // Filter Logic: If group is fully planned, skip.
            // If we wiped OPEN trucks, we check if remaining PLANNED trucks cover it.
            const availableGroups = groups.filter(g => {
                const hasPlannedTruck = g.trucks.some(t => t.status === TruckGroupStatus.PLANNED);
                return !hasPlannedTruck;
            });

            // Convert to Items
            itemsToPack = availableGroups.map(g => ({
                id: g.id,
                ldm: Number(g.totalLDM),
                salesOrders: g.salesOrders,
                tpaGroupId: g.id
            }));
        }

        if (itemsToPack.length === 0) return { trucksCreated: 0 };


        // 4. Bin Packing with Splitting
        type TruckDraft = {
            id: string,
            loadLdm: number,
            contents: { item: typeof itemsToPack[0], ldmShare: number }[]
            // We track which item is in this truck and how much LDM of it.
        };

        const trucks: TruckDraft[] = [];

        for (const item of itemsToPack) {
            let remainingItemLdm = item.ldm;
            if (remainingItemLdm <= 0) remainingItemLdm = 0.1; // Safety

            while (remainingItemLdm > 0.001) {
                let assigned = false;

                // Try fit in existing
                for (const truck of trucks) {
                    const space = maxLdm - truck.loadLdm;
                    if (space > 0.01) {
                        const take = Math.min(space, remainingItemLdm);

                        truck.contents.push({ item, ldmShare: take });
                        truck.loadLdm += take;

                        remainingItemLdm -= take;
                        assigned = true;
                        if (remainingItemLdm <= 0.001) break;
                    }
                }

                // Create new truck
                if (!assigned || remainingItemLdm > 0.001) {
                    const take = Math.min(maxLdm, remainingItemLdm);
                    trucks.push({
                        id: `draft-${trucks.length}`,
                        loadLdm: take,
                        contents: [{ item, ldmShare: take }]
                    });
                    remainingItemLdm -= take;
                }
            }
        }

        // 5. Persist
        for (const t of trucks) {
            // Calculate Aggregates
            // For Selected Orders: We might have specific orders. 
            // If we SPLIT the selection across trucks, we need to decide WHICH orders go where.
            // This is the tricky part of "Precise Order Linking".
            // Bin Packing splits LDM (float). Orders are discrete items.
            // Metric: We need to distribute the orders from `item.salesOrders` into this truck matching `ldmShare`.

            // Logic: Iterate orders in the Item, fill truck until `ldmShare` is reached.
            // Note: This modifies the Item's "Available Orders" list if we process sequentially.
            // We need to keep track of packed orders to avoid duplication.

            // Since we iterate `trucks` sequentially (and they were created sequentially):
            // We can consume orders from the item.

            const truckOrders: any[] = [];

            for (const content of t.contents) {
                const targetLdm = content.ldmShare;
                let currentLdm = 0;
                const sourceOrders = content.item.salesOrders;

                // We need to pick orders that haven't been assigned yet?
                // `itemsToPack` objects are shared references in the loop? 
                // Yes, `item` in loop is reference. We can mark orders as "taken".

                for (const order of sourceOrders) {
                    // Check if taken (we can add a temp flag or check local set)
                    if ((order as any)._taken) continue;

                    // Greedy pick
                    // If this order fits effectively or is needed to fill the chunk
                    truckOrders.push(order);
                    (order as any)._taken = true;
                    currentLdm += Number(order.loadingMeters || 0);

                    // If we exceed targetLdm significantly? 
                    // Bin Packing worked on float LDM. Discrete orders might not match exactly.
                    // We just fill until we are "close enough" or exhausted?
                    // Or just put all orders in?
                    // If `ldmShare` < `item.ldm`, it means split.

                    // Refined Logic:
                    // If we are taking a "Share", we take orders summing up to that share.
                    if (currentLdm >= targetLdm - 0.1) break;
                }
            }

            // Calc Stats from actual orders
            const truckPallets = truckOrders.reduce((s, o) => s + (o.pallets || 0), 0); // or item ratio
            const truckWeight = truckOrders.reduce((s, o) => s + Number(o.weight || 0), 0);
            const truckVol = truckOrders.reduce((s, o) => s + Number(o.volumeM3 || 0), 0);
            const truckOrdersCount = truckOrders.length;
            const truckRealLdm = truckOrders.reduce((s, o) => s + Number(o.loadingMeters || 0), 0); // Recalc real LDM

            // Create Truck
            const truckGroup = await prisma.truckGroup.create({
                data: {
                    truckNumber: `TRK-${laneId.substring(0, 3)}-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 100)}`,
                    status: TruckGroupStatus.OPEN,
                    laneId,
                    shipDate,
                    maxLdm,
                    truckType,
                    customLdm: truckType === 'CUSTOM' ? customLdm : null,
                    truckTotalLDM: truckRealLdm, // Use real sum of orders
                    truckTotalPallets: truckPallets,
                    truckTotalWeight: truckWeight,
                    truckTotalVolume: truckVol,
                    ordersCount: truckOrdersCount,
                    // Connect Groups (Unchanged - M:N)
                    tpaGroups: {
                        connect: t.contents.map(c => ({ id: c.item.tpaGroupId })).filter(x => x.id)
                    },
                    // Connect SalesOrders (NEW)
                    salesOrders: {
                        connect: truckOrders.map(o => ({ id: o.id }))
                    }
                }
            });

            // Update Groups status to TRUCKED
            for (const c of t.contents) {
                if (c.item.tpaGroupId) {
                    await prisma.tPAGroup.update({
                        where: { id: c.item.tpaGroupId },
                        data: { status: TPAGroupStatus.TRUCKED }
                    });
                }
            }

            // Log
            await EventLogService.log('TRUCK', truckGroup.id, 'CREATED', {
                orders: truckOrders.map(o => o.id),
                type: truckType
            });
        }

        return { trucksCreated: trucks.length };
    }

    static async recalculateTruckMetrics(truckId: string) {
        const truck = await prisma.truckGroup.findUnique({
            where: { id: truckId },
            include: { tpaGroups: true }
        });

        if (!truck) return; // or throw

        let totalVol = 0;
        let totalWeight = 0;
        let totalPallets = 0;
        let totalLdm = 0;
        let totalOrders = 0;

        for (const g of truck.tpaGroups) {
            totalVol += Number(g.totalVolumeM3);
            totalWeight += Number(g.totalWeight);
            totalPallets += Number(g.totalPallets);
            totalLdm += Number(g.totalLDM);
            totalOrders += g.ordersCount;
        }

        await prisma.truckGroup.update({
            where: { id: truckId },
            data: {
                truckTotalVolume: totalVol,
                truckTotalWeight: totalWeight,
                truckTotalPallets: totalPallets,
                truckTotalLDM: totalLdm,
                ordersCount: totalOrders
            }
        });

        await EventLogService.log('TRUCK', truckId, 'RECALCULATED', { newLdm: totalLdm });
    }
}
