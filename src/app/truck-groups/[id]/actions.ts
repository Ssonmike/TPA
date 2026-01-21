"use server"

import { TruckService } from "@/services/truck.service";
import { revalidatePath } from "next/cache";

export async function recalcTruckAction(truckId: string) {
    try {
        await TruckService.recalculateTruckMetrics(truckId);
        revalidatePath(`/truck-groups/${truckId}`);
        return { success: true };
    } catch (e) {
        return { success: false, error: "Recalc failed" };
    }
}
