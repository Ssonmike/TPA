"use server"

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { ClassificationService } from "@/services/classification.service";
import { CalcService } from "@/services/calc.service";
import { PlanningService } from "@/services/planning.service";
import { GroupingService } from "@/services/grouping.service";

import { EventLogService } from "@/services/event-log.service";
// ... imports

export async function toggleHoldAction(ids: string[], hold: boolean) {
    const status = hold ? 'ON_HOLD' : 'OPEN';
    await prisma.salesOrder.updateMany({
        where: { id: { in: ids } },
        data: { status }
    });

    // Batch Log
    for (const id of ids) {
        await EventLogService.log('ORDER', id, hold ? 'HELD' : 'RELEASED', { newStatus: status });
    }

    revalidatePath("/");
    return { success: true };
}

export async function reEvaluateAction(ids: string[]) {
    for (const id of ids) {
        await ClassificationService.classifyOrder(id);
    }
    revalidatePath("/");
    return { success: true };
}

export async function calculateSelectedAction(ids: string[]) {
    try {
        // 1. Calc All
        // Note: Classification happens at seed/ingest. Calculate simply computes LDM.
        await CalcService.executeFullCalculation(ids);

        revalidatePath("/");
        console.log(`[Action] Calculation success`);
        return { success: true };
    } catch (error: any) {
        console.error("[Action] Calculate Failed:", error);
        // Ensure we return a serializable object, not the error object itself if it has cycles
        return { success: false, error: error.message };
    }
}

export async function groupSelectedAction(ids: string[]) {
    // 1. Fetch Orders to determine eligibility
    const orders = await prisma.salesOrder.findMany({
        where: { id: { in: ids } },
        select: {
            id: true,
            laneId: true,
            requestedShippingDate: true,
            shippingType: true
        }
    });

    // 2. Filter for GROUPAGE only
    // User Requirement: "Group Orders" only groups GROUPAGE. Direct orders stay under TPA Number.
    const groupageOrders = orders.filter(o => o.shippingType === 'GROUPAGE');

    if (groupageOrders.length === 0) {
        console.log("[Action] Group Selected: No GROUPAGE orders found in selection. Skipping.");
        return { success: false, message: "No Groupage orders selected." };
    }

    if (groupageOrders.length < orders.length) {
        console.log(`[Action] Group Selected: Skipped ${orders.length - groupageOrders.length} non-groupage orders.`);
    }

    // 3. Trigger Grouping for relevant Lanes/Dates
    // Optimization: potentially pass IDs to service if service supported it, 
    // but for now we follow the bucket pattern.
    const candidates = new Set<string>();
    groupageOrders.forEach(o => {
        if (o.laneId) candidates.add(`${o.laneId}|${o.requestedShippingDate.toISOString()}`);
    });

    for (const c of Array.from(candidates)) {
        const [lid, dStr] = c.split('|');
        await GroupingService.executeGrouping(lid, new Date(dStr));
    }

    revalidatePath("/");
    return { success: true };
}

export async function planSelectedAction(ids: string[], type: 'PARCEL' | 'DIRECT') {
    if (type === 'PARCEL') {
        await PlanningService.planParcel(ids);
    } else {
        await PlanningService.planDirect(ids);
    }
    revalidatePath("/");
    return { success: true };
}

export async function unplanSelectedAction(ids: string[]) {
    await PlanningService.unplanOrders(ids);
    revalidatePath("/");
    return { success: true };
}
