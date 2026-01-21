"use server"

import { GroupingService } from "@/services/grouping.service";
import { revalidatePath } from "next/cache";

export async function groupOrdersAction() {
    try {
        await GroupingService.executeGrouping();
        revalidatePath("/");
        revalidatePath("/tpa-groups");
        revalidatePath("/groupage");
        return { success: true };
    } catch (e) {
        console.error("Grouping failed", e);
        return { success: false, error: "Grouping failed" };
    }
}
