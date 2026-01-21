"use server"

import { TruckGroupStatus, LoadType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { EventLogService } from "@/services/event-log.service";

export async function planDirectOrderAction(
    orderId: string,
    carrierCode: string,
    pickupDateStr: string,
    pickupTimeStr: string, // Optional? Implementation plan says optional, but for ref gen we usually need date. Time might be empty string.
    loadType: LoadType,
    bookingRequired: boolean
) {
    try {
        if (!orderId || !carrierCode || !pickupDateStr || !loadType) {
            throw new Error("Missing required fields");
        }

        // 1. Resolve Carrier ID
        let carrierRef = carrierCode;
        const carrier = await prisma.carrier.findUnique({ where: { code: carrierCode } });
        if (carrier) {
            carrierRef = carrier.id;
        }

        // 2. Dates
        const pickupDate = new Date(pickupDateStr);
        let pickupDateTime: Date | null = null;
        if (pickupTimeStr) {
            const [hh, mm] = pickupTimeStr.split(':').map(Number);
            pickupDateTime = new Date(pickupDate);
            pickupDateTime.setHours(hh, mm);
        }

        // 3. Generate Ref
        // Logic: <CARRIER><DD><MM><YYYY><D|P><NN>
        const refCarrierCode = carrierCode.toUpperCase().substring(0, 3);
        const d = String(pickupDate.getDate()).padStart(2, '0');
        const m = String(pickupDate.getMonth() + 1).padStart(2, '0');
        const y = pickupDate.getFullYear();
        const typeChar = loadType === 'DIRECT' ? 'D' : 'P';

        const baseRef = `${refCarrierCode}${d}${m}${y}${typeChar}`;

        // Count existing *Planned* trucks with same prefix
        const count = await prisma.truckGroup.count({
            where: {
                status: TruckGroupStatus.PLANNED,
                executionRef: {
                    startsWith: baseRef
                }
            }
        });
        const sequence = String(count + 1).padStart(2, '0');
        const executionRef = `${baseRef}${sequence}`;

        // 4. Create TruckGroup (Direct Wrapper)
        // Direct orders typically 1 order = 1 truck (LTL/FTL handled conceptually as "Direct shipment")
        // We create a TruckGroup to hold the planning data.

        // Fetch order to get heavy LDM/Weight stuff if we want to copy aggregates?
        // For MVP, we just link. Aggregates on TruckGroup might be 0 initially, 
        // or we allow Recalc? "Do NOT reuse Truck Calc".
        // Use a basic TruckGroup creation.

        const newTruck = await prisma.truckGroup.create({
            data: {
                status: TruckGroupStatus.PLANNED,
                carrierId: carrierRef,
                plannedPickUpDate: pickupDate,
                plannedShippingTime: pickupDateTime,
                loadType,
                executionRef,
                bookingRequired,
                truckType: 'STANDARD', // Default or irrelevant for Direct
                truckNumber: `DIR-${executionRef}`, // Unique constraint
                // We should probably sum up the Order's LDM/Weight, but prompt says "Direct orders... Do NOT use Truck Calc"
                // We can do a quick aggregate if we want data integrity, or leave 0.
                // Let's leave 0 for now or quick look up.
            }
        });

        // 5. Update Order
        await prisma.salesOrder.update({
            where: { id: orderId },
            data: {
                truckGroupId: newTruck.id,
                status: 'PLANNED' // SalesOrderStatus.PLANNED
            }
        });

        // 6. Log
        await EventLogService.log('ORDER', orderId, 'DIRECT_PLANNED', {
            truckId: newTruck.id,
            carrier: carrierCode,
            executionRef,
            bookingRequired
        });

        revalidatePath("/direct");
        revalidatePath("/dashboard");
        return { success: true, executionRef };

    } catch (e) {
        console.error("Plan Direct Failed", e);
        return { success: false, error: "Failed to plan direct order" };
    }
}
