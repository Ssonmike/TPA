"use server"

import { PlanningService } from "@/services/planning.service";
import { revalidatePath } from "next/cache";
import { TruckGroupStatus, LoadType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { EventLogService } from "@/services/event-log.service";

export async function executePlanAction(
    truckId: string,
    carrierId: string, // or code? MVP says "KLG, DSV..." are hardcoded values for dropdown, but we store carrierId?
    // PROMPT: "1) Carrier - Dropdown... source: if table Carrier exists, use it. if not, use hardcoded."
    // PROMPT: "Persist: carrierId (or carrierCode string in MVP)"
    // We have Carrier model. We should try to resolve ID from code if passed, or expect ID.
    // Let's assume we pass the Code/Name selected and try to find/create or store string if field is String (it is String?).
    // Schema: carrierId String? 
    // I will accept carrierCode as input and resolve it.
    carrierCode: string,
    pickupDateStr: string, // YYYY-MM-DD
    pickupTimeStr: string, // HH:mm
    loadType: LoadType
) {
    try {
        // 1. Validate
        if (!truckId || !carrierCode || !pickupDateStr || !pickupTimeStr || !loadType) {
            throw new Error("Missing required fields");
        }

        // 2. Resolve Carrier
        // In MVP we might just store the code if we don't strictly enforce relation, 
        // but Carrier table exists. Let's find it.
        let carrierRef = carrierCode;
        const carrier = await prisma.carrier.findUnique({ where: { code: carrierCode } });
        if (carrier) {
            carrierRef = carrier.id;
        }
        // If not found, we just store the code in carrierId? Or should we fail?
        // Prompt: "usar estos valores hardcodeados (MVP): KLG, DSV... si existe tabla Carrier, usarla"
        // Prompt: "Persist carrierId (or carrierCode string in MVP)"
        // I'll stick to storing the code if ID not found, assuming ID field is loose string.

        const pickupDate = new Date(pickupDateStr);
        // Set time
        const [hh, mm] = pickupTimeStr.split(':').map(Number);
        const pickupDateTime = new Date(pickupDate);
        pickupDateTime.setHours(hh, mm);


        // 3. Generate Execution Ref
        // Logic: <CARRIER><DD><MM><YYYY><D|P><NN>
        // Count existing trucks with same: Carrier + PickupDate + LoadType

        // Need Carrier *Code* for the Ref, even if we stored ID.
        const refCarrierCode = carrierCode.toUpperCase().substring(0, 3); // Safety clip? Prompt ex: "KLG"

        const d = String(pickupDate.getDate()).padStart(2, '0');
        const m = String(pickupDate.getMonth() + 1).padStart(2, '0');
        const y = pickupDate.getFullYear();
        const typeChar = loadType === 'DIRECT' ? 'D' : 'P';

        const baseRef = `${refCarrierCode}${d}${m}${y}${typeChar}`;

        // Count existing
        // We look for trucks that are PLANNED and match this criteria.
        // Prisma count.
        // Note: We need to filter by day.
        const startOfDay = new Date(pickupDateStr);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(pickupDateStr);
        endOfDay.setHours(23, 59, 59, 999);

        // We need to count based on what produces the same "Base Ref".
        // IE: Same Carrier Code (stored in carrierId? or inferred), Same Date, Same LoadType.
        // Ideally we search by `executionRef` startsWith `baseRef`. 
        // That is safer than relying on loose fields matching.

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


        // 4. Update
        await prisma.truckGroup.update({
            where: { id: truckId },
            data: {
                status: TruckGroupStatus.PLANNED,
                carrierId: carrierRef,
                plannedPickUpDate: pickupDate,
                plannedShippingTime: pickupDateTime,
                loadType,
                executionRef
            }
        });

        // 5. Update children?
        // "Actualizar grupos y órdenes asociadas a estado PLANNED (si ya existe este flujo, reutilizarlo)."
        // We can do it manually here to be safe.
        const truck = await prisma.truckGroup.findUnique({
            where: { id: truckId },
            include: { tpaGroups: true }
        });

        if (truck) {
            await prisma.tPAGroup.updateMany({
                where: { truckGroupId: truckId },
                data: { status: 'PLANNED' } // Enum TPAGroupStatus
            });

            // Orders
            // Find all orders in these groups
            // Or update via truck relation if exists
            await prisma.salesOrder.updateMany({
                where: { truckGroupId: truckId }, // Direct link exists
                data: { status: 'PLANNED' } // Enum SalesOrderStatus
            });
        }


        // 6. Log
        await EventLogService.log('TRUCK', truckId, 'TRUCK_PLANNED', {
            carrier: carrierCode,
            pickupDate: pickupDateStr,
            pickupTime: pickupTimeStr,
            loadType,
            executionRef
        });

        revalidatePath("/");
        revalidatePath("/groupage");
        return { success: true, executionRef };

    } catch (e) {
        console.error("Execute Plan Failed", e);
        return { success: false, error: "Failed to execute plan" };
    }
}

export async function unplanTruckAction(truckId: string) {
    try {
        await PlanningService.unplanTruck(truckId);
        revalidatePath("/");
        return { success: true };
    } catch (e) {
        console.error("Unplan Truck failed", e);
        return { success: false, error: "Failed" };
    }
}

export async function cancelGroupAction(groupId: string) {
    try {
        await PlanningService.cancelGroup(groupId);
        revalidatePath("/");
        return { success: true };
    } catch (e) {
        console.error("Cancel Group failed", e);
        return { success: false, error: "Failed" };
    }
}

export async function planParcelAction() {
    try {
        const { prisma } = await import("@/lib/db"); // Lazy
        // Find all candidates
        const orders = await prisma.salesOrder.findMany({
            where: { status: 'CALCULATED', shippingType: 'PARCEL' },
            select: { id: true }
        });
        await PlanningService.planParcel(orders.map(o => o.id));
        revalidatePath("/");
        return { success: true };
    } catch (e) {
        return { success: false, error: "Failed" };
    }
}

export async function planDirectAction() {
    try {
        const { prisma } = await import("@/lib/db");
        // Find all candidates
        const orders = await prisma.salesOrder.findMany({
            where: { status: 'CALCULATED', shippingType: { in: ['DIRECT_LTL', 'DIRECT_FTL'] } },
            select: { id: true }
        });
        await PlanningService.planDirect(orders.map(o => o.id));
        revalidatePath("/");
        return { success: true };
    } catch (e) {
        return { success: false, error: "Failed" };
    }
}
