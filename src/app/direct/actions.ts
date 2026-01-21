"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { CalcService } from "@/services/calc.service";

export async function groupDirectOrdersAction(orderIds: string[]) {
    await CalcService.groupOrders(orderIds);
    revalidatePath("/direct");
}

export async function planDirectOrdersAction(orderIds: string[]) {
    try {
        if (!orderIds.length) throw new Error("No orders selected");

        await prisma.salesOrder.updateMany({
            where: { id: { in: orderIds } },
            data: { status: 'PLANNED' }
        });

        revalidatePath('/direct');
        revalidatePath('/cba');
        return { success: true };
    } catch (error) {
        console.error("Failed to plan orders", error);
        return { success: false, message: "Failed to plan orders" };
    }
}

// Assign Carrier -> REQUESTED
export async function assignCarrierAction(
    orderIds: string[],
    carrierName: string,
    firstPickupDate: Date
) {
    if (!orderIds.length) return { success: false, message: "No orders selected" };

    try {
        await prisma.salesOrder.updateMany({
            where: {
                id: {
                    in: orderIds
                }
            },
            data: {
                carrierName: carrierName,
                firstPickupDate: firstPickupDate,
                status: 'REQUESTED' // New status flow
            }
        });

        revalidatePath("/direct");
        return { success: true, message: `Updated ${orderIds.length} orders to REQUESTED` };
    } catch (error) {
        console.error("Failed to assign carrier:", error);
        return { success: false, message: `Failed to update orders: ${(error as Error).message}` };
    }
}

// Exec / Plan -> PLANNED
export async function executeDirectPlanAction(orderIds: string[]) {
    if (!orderIds.length) return { success: false, message: "No orders selected" };

    try {
        await prisma.salesOrder.updateMany({
            where: {
                id: {
                    in: orderIds
                }
            },
            data: {
                status: 'PLANNED'
            }
        });

        revalidatePath("/direct");
        return { success: true, message: `Executed ${orderIds.length} orders` };
    } catch (error) {
        console.error("Failed to execute plan:", error);
        return { success: false, message: "Failed to execute plan" };
    }
}
