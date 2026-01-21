import { prisma } from '@/lib/db';
import { SalesOrderStatus } from '@prisma/client';
import { EventLogService } from './event-log.service';
import { OrtecConsolidationService } from './ortec-consolidation.service';

export class CalcService {

    // Deterministic Logic
    static calculateMetrics(volumeM3: number) {
        // pallets = ceil(volumeM3 / 1.2)
        const pallets = Math.ceil(volumeM3 / 1.2);
        // ldm = round(pallets * 0.42, 2)
        const ldm = Number((pallets * 0.42).toFixed(2));
        return { pallets, ldm };
    }

    static async requestCalculation(orderIds?: string[]) {
        // Filter out PARCEL
        const where: any = orderIds ? { id: { in: orderIds } } : {};
        where.status = SalesOrderStatus.OPEN;
        where.shippingType = { not: 'PARCEL' };

        const orders = await prisma.salesOrder.findMany({ where });

        // Update to REQUESTED
        await prisma.salesOrder.updateMany({
            where: { id: { in: orders.map(o => o.id) } },
            data: { status: SalesOrderStatus.PALLET_CALC_REQUESTED }
        });

        // Log
        if (orders.length > 0) {
            await EventLogService.log('SYSTEM', 'BATCH', 'CALC_REQUESTED', { count: orders.length });
        }

        return orders.length;
    }

    static async completeCalculation(orderIds?: string[]) {
        // Find orders in REQUESTED (or P.Calc) state
        const where: any = orderIds ? { id: { in: orderIds } } : { status: SalesOrderStatus.PALLET_CALC_REQUESTED };

        // Exclude PARCEL explicitly even if requested by ID
        where.shippingType = { not: 'PARCEL' };

        const orders = await prisma.salesOrder.findMany({ where });
        if (orders.length === 0) return;

        // 1. Assign TPA Numbers (In-Memory)
        const assignment = OrtecConsolidationService.assignTpaNumbers(orders);

        // 2. Group by TPA Number
        const groups = new Map<string, typeof orders>();
        for (const order of orders) {
            const tpa = assignment.get(order.id);
            if (!tpa) continue;
            if (!groups.has(tpa)) {
                groups.set(tpa, []);
            }
            groups.get(tpa)!.push(order);
        }

        // 3. Update Orders with TPA# and Metrics (NO Group Entity Creation yet)
        for (const [tpaNumber, groupOrders] of groups.entries()) {
            // Consolidated Metrics
            const totalVol = groupOrders.reduce((sum, o) => sum + Number(o.volumeM3), 0);

            // ORTEC Stub Rule: ceil(TotalVol / 1.2)
            const tpaTotalPallets = Math.ceil(totalVol / 1.2);
            const tpaTotalLdm = Number((tpaTotalPallets * 0.42).toFixed(2));
            const soCount = groupOrders.length;

            // Effective Type Logic (still relevant for individual orders?)
            // Usually effective type is property of the GROUP. But we can store it on order too.
            let effectiveType: any = 'GROUPAGE';
            const isDirectPresent = groupOrders.some(o => o.shippingType === 'DIRECT_LTL' || o.shippingType === 'DIRECT_FTL');
            const allParcel = groupOrders.every(o => o.shippingType === 'PARCEL');

            if (isDirectPresent) effectiveType = 'DIRECT_LTL';
            else if (tpaTotalLdm > 3.0) effectiveType = 'DIRECT_LTL'; // Escalation
            else if (allParcel) effectiveType = 'PARCEL';

            // Distribute & Update
            for (const order of groupOrders) {
                const vol = Number(order.volumeM3);

                // Individual Metrics (Legacy / Baseline)
                const indivPallets = Math.ceil(vol / 1.2);
                const indivLdm = Number((indivPallets * 0.42).toFixed(2));

                // Allocated Shared LDM
                const ratio = totalVol > 0 ? vol / totalVol : 0;
                const allocatedLdm = Number((tpaTotalLdm * ratio).toFixed(2));

                await prisma.salesOrder.update({
                    where: { id: order.id },
                    data: {
                        // Individual
                        pallets: indivPallets,
                        loadingMeters: indivLdm,

                        // Consolidated / TPA
                        tpaNumber: tpaNumber,
                        // tpaGroupId: NO GROUP ID YET
                        tpaNumberSoCount: soCount,
                        tpaTotalPallets: tpaTotalPallets,
                        tpaTotalLdm: tpaTotalLdm,
                        ldmAllocated: allocatedLdm,

                        status: SalesOrderStatus.CALCULATED,
                        effectiveShipmentType: effectiveType
                    }
                });
            }
        }

        await EventLogService.log('SYSTEM', 'BATCH', 'CALC_COMPLETED', { count: orders.length });
    }

    // New Action: Group Orders (Plan Groups)
    static async groupOrders(orderIds: string[]) {
        const orders = await prisma.salesOrder.findMany({
            where: { id: { in: orderIds }, status: SalesOrderStatus.CALCULATED } // Must be calculated first
        });

        if (orders.length === 0) return;

        // Group by existing TPA Number
        const groups = new Map<string, typeof orders>();
        for (const order of orders) {
            const tpa = order.tpaNumber;
            if (!tpa) continue;
            if (!groups.has(tpa)) groups.set(tpa, []);
            groups.get(tpa)!.push(order);
        }

        for (const [tpaNumber, groupOrders] of groups.entries()) {
            // Re-calc aggregates from DB data (trusted)
            const totalVol = groupOrders.reduce((sum, o) => sum + Number(o.volumeM3), 0);
            const totalWeight = groupOrders.reduce((sum, o) => sum + Number(o.weight), 0);
            const tpaTotalPallets = Math.ceil(totalVol / 1.2); // Or take from one order? Better recalc to be safe.
            const tpaTotalLdm = Number((tpaTotalPallets * 0.42).toFixed(2));

            // Determine Effective Type
            let effectiveType: any = 'GROUPAGE';
            const isDirectPresent = groupOrders.some(o => o.shippingType === 'DIRECT_LTL' || o.shippingType === 'DIRECT_FTL');
            if (isDirectPresent || tpaTotalLdm > 3.0) effectiveType = 'DIRECT_LTL';

            // Create Entity
            const tpaGroup = await prisma.tPAGroup.create({
                data: {
                    tpaReference: tpaNumber,
                    groupNo: tpaNumber,
                    shippingType: effectiveType,
                    status: 'OPEN',
                    ordersCount: groupOrders.length,
                    totalLDM: tpaTotalLdm,
                    totalPallets: tpaTotalPallets,
                    totalVolumeM3: totalVol,
                    totalWeight: totalWeight,
                    destinationCountry: groupOrders[0].country, // Logic check: MIX? Header usually takes first or mixed. DB Schema usually stores one.
                    destinationCity: groupOrders[0].city,
                    shipDate: groupOrders[0].requestedShippingDate
                }
            });

            // Link
            await prisma.salesOrder.updateMany({
                where: { id: { in: groupOrders.map(o => o.id) } },
                data: { tpaGroupId: tpaGroup.id }
            });
        }
    }

    // Helper "Do It All" for the button
    static async executeFullCalculation(orderIds?: string[]) {
        await this.requestCalculation(orderIds);
        await this.completeCalculation(orderIds);
    }
}
