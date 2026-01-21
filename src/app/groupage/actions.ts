"use server"

import { LaneService } from "@/services/lane.service";
import { revalidatePath } from "next/cache";

export async function createLaneAction(formData: FormData) {
    const name = formData.get('name') as string;
    const countries = formData.get('countries') as string;

    if (!name || !countries) return { success: false, error: "Missing fields" };

    try {
        await LaneService.createLane(name, countries);
        revalidatePath('/groupage');
        return { success: true };
    } catch (e) {
        console.error(e);
        return { success: false, error: "Failed to create lane" };
    }
}
