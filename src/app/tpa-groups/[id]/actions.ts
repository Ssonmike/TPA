"use server"

import { GroupingService } from "@/services/grouping.service";
import { revalidatePath } from "next/cache";

export async function addOrderToGroupAction(groupId: string, orderId: string) {
    try {
        await GroupingService.addOrder(groupId, orderId);
        revalidatePath(`/tpa-groups/${groupId}`);
        return { success: true };
    } catch (e) {
        return { success: false, error: "Failed to add" };
    }
}

export async function removeOrderFromGroupAction(groupId: string, orderId: string) {
    try {
        await GroupingService.removeOrder(groupId, orderId);
        revalidatePath(`/tpa-groups/${groupId}`);
        return { success: true };
    } catch (e) {
        return { success: false, error: "Failed to remove" };
    }
}
