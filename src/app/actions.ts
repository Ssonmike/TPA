"use server"

import { ClassificationService } from "@/services/classification.service";
import { CalcService } from "@/services/calc.service";
import { revalidatePath } from "next/cache";

export async function calculateAllOpenOrdersAction() {
    try {
        // 1. Calc All (LDM/Pallets only)
        // Note: Classification is done at ingest/seed.
        await CalcService.executeFullCalculation();

        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error("Calculation failed:", error);
        return { success: false, error: "Failed" };
    }
}
