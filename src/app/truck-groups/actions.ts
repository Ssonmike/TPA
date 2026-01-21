"use server"

import { TruckService } from "@/services/truck.service";
import { revalidatePath } from "next/cache";

import { TruckType } from "@prisma/client";

export async function calculateTrucksAction(laneId: string, dateStr: string, truckType: TruckType = 'STANDARD', customLdm?: number, selectedOrderIds?: string[]) {
    try {
        const date = new Date(dateStr);

        await TruckService.calculateTruckPlanning(laneId, date, truckType, customLdm, selectedOrderIds);

        revalidatePath("/");
        revalidatePath("/groupage");
        revalidatePath("/truck-groups");
        return { success: true };
    } catch (e) {
        console.error("Truck Calc failed", e);
        return { success: false, error: "Failed" };
    }
}
