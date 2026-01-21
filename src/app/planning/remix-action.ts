"use server"

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { EventLogService } from "@/services/event-log.service";
import { SalesOrderStatus, TPAGroupStatus } from "@prisma/client";

/**
 * Recalculate ORTEC (Re-Mix) Action
 * 
 * Consolidates selected Sales Orders under a NEW TPA Number
 */
export async function recalculateOrtecAction(orderIds: string[]) {
    try {
        if (!orderIds || orderIds.length === 0) {
            throw new Error("No orders selected");
        }

        console.log("[ReMix] Starting for orders:", orderIds);

        // 1. Fetch Orders
        const orders = await prisma.salesOrder.findMany({
            where: { id: { in: orderIds } }
        });

        if (orders.length !== orderIds.length) {
            const foundIds = orders.map(o => o.id);
            const missing = orderIds.filter(id => !foundIds.includes(id));
            throw new Error(`One or more orders not found: ${missing.join(', ')}`);
        }

        // 2. CRITICAL: Generate STATIC constants ONCE before any operations
        // These MUST NOT change during the transaction
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 9).toUpperCase();
        const finalTpaId = `TPA-REMIX-${timestamp}-${randomSuffix}`;

        console.log("[ReMix Backend] Generated FINAL TPA ID:", finalTpaId);
        console.log("[ReMix Backend] This ID will be used for ALL", orders.length, "orders");

        // Calculate Metrics
        let totalVol = 0;
        for (const order of orders) {
            totalVol += Number(order.volumeM3);
        }

        const totalPallets = Math.ceil(totalVol / 1.2);
        const totalLdm = Number((totalPallets * 0.42).toFixed(2));

        // 3. Determine Effective Shipment Type (STATIC - calculated once)
        const isDirectPresent = orders.some(o => o.shippingType === 'DIRECT_LTL' || o.shippingType === 'DIRECT_FTL');

        let finalEffectiveType = 'GROUPAGE';

        if (isDirectPresent) {
            finalEffectiveType = 'DIRECT_LTL';
        } else {
            if (totalLdm > 3.0) {
                finalEffectiveType = 'DIRECT_LTL';
            } else {
                const allParcel = orders.every(o => o.shippingType === 'PARCEL');
                if (allParcel) {
                    finalEffectiveType = 'PARCEL';
                } else {
                    finalEffectiveType = 'GROUPAGE';
                }
            }
        }

        console.log("[ReMix Backend] FINAL effectiveType:", finalEffectiveType);
        console.log("[ReMix Backend] Total LDM:", totalLdm);

        // 4. Create TPAGroup to physically group orders together
        const newGroup = await prisma.tPAGroup.create({
            data: {
                tpaReference: finalTpaId,
                groupNo: finalTpaId,
                shippingType: finalEffectiveType as any,
                status: TPAGroupStatus.PLANNED,
                totalLDM: totalLdm,
                totalPallets: totalPallets,
                ordersCount: orders.length,
                plannedDate: orders[0].requestedShippingDate,
                shipDate: orders[0].requestedShippingDate,
                destinationCountry: orders[0].country,
                destinationCity: orders[0].city
            }
        });

        console.log("[ReMix Backend] Created TPAGroup:", newGroup.id);

        // 5. Persist Planning Result
        const result = await prisma.planningResult.create({
            data: {
                tpaNumber: finalTpaId,
                totalLdm,
                totalPallets,
                effectiveShipmentType: finalEffectiveType,
                metadata: {
                    type: "REMIX",
                    originalTpaNumbers: [...new Set(orders.map(o => o.tpaNumber).filter(Boolean))],
                    orderCount: orders.length,
                    isEscalated: finalEffectiveType === 'DIRECT_LTL' && !isDirectPresent
                }
            }
        });

        // 5. Update Orders + History (ATOMIC TRANSACTION)
        console.log("[ReMix Backend] Starting transaction with STATIC TPA:", finalTpaId);

        await prisma.$transaction(async (tx) => {
            for (const order of orders) {
                // Archive History
                await tx.salesOrderHistory.create({
                    data: {
                        salesOrderId: order.id,
                        tpaNumber: order.tpaNumber,
                        tpaGroupId: order.tpaGroupId,
                    }
                });

                // Allocation
                const vol = Number(order.volumeM3);
                const ratio = totalVol > 0 ? vol / totalVol : 0;
                const allocatedLdm = Number((totalLdm * ratio).toFixed(2));

                // Indiv Metrics
                const indivPallets = Math.ceil(vol / 1.2);
                const indivLdm = Number((indivPallets * 0.42).toFixed(2));

                const dataToUpdate: any = {
                    tpaNumber: finalTpaId, // STATIC CONSTANT - same for ALL
                    tpaNumberSoCount: orders.length,
                    tpaTotalPallets: totalPallets,
                    tpaTotalLdm: totalLdm,
                    ldmAllocated: allocatedLdm,

                    activePlanningResultId: result.id,
                    effectiveShipmentType: finalEffectiveType, // STATIC CONSTANT - same for ALL

                    tpaGroupId: newGroup.id, // CRITICAL: Assign to same group for UI grouping
                    status: SalesOrderStatus.CALCULATED
                };

                if (order.shippingType === 'PARCEL') {
                    dataToUpdate.pallets = indivPallets;
                    dataToUpdate.loadingMeters = indivLdm;
                }

                console.log(`[ReMix Backend] Updating ${order.sapSalesOrderNumber} with TPA: ${finalTpaId} and Type: ${finalEffectiveType}`);

                await tx.salesOrder.update({
                    where: { id: order.id },
                    data: dataToUpdate
                });
            }
        });

        console.log("[ReMix Backend] Transaction complete. All orders now have TPA:", finalTpaId);

        // 6. Log
        await EventLogService.log('PLANNING', result.id, 'REMIX_CALCULATION', {
            tpaNumber: finalTpaId,
            orders: orders.length,
            effectiveType: finalEffectiveType
        });

        revalidatePath("/");
        revalidatePath("/groupage");
        revalidatePath("/direct");
        revalidatePath("/cba");
        return { success: true, tpaNumber: finalTpaId };

    } catch (e: any) {
        console.error("Remix Action Failed", e);
        return { success: false, error: e.message };
    }
}
