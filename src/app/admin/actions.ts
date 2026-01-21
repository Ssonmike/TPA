"use server"

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

// --- Country Rules ---
export async function createCountryRule(data: any) {
    await prisma.countryRule.create({ data });
    revalidatePath("/admin/country-rules");
}
export async function updateCountryRule(id: string, data: any) {
    await prisma.countryRule.update({ where: { id }, data });
    revalidatePath("/admin/country-rules");
}
export async function deleteCountryRule(id: string) {
    await prisma.countryRule.delete({ where: { id } });
    revalidatePath("/admin/country-rules");
}

// --- Parcel Rules ---
export async function createParcelRule(data: any) {
    await prisma.parcelRule.create({ data });
    revalidatePath("/admin/parcel-rule");
}
export async function updateParcelRule(id: string, data: any) {
    await prisma.parcelRule.update({ where: { id }, data });
    revalidatePath("/admin/parcel-rule");
}
export async function deleteParcelRule(id: string) {
    await prisma.parcelRule.delete({ where: { id } });
    revalidatePath("/admin/parcel-rule");
}

// --- Direct Rules ---
export async function createDirectRule(data: any) {
    await prisma.directShipToRule.create({ data });
    revalidatePath("/admin/direct-shipto-rules");
}
export async function updateDirectRule(id: string, data: any) {
    await prisma.directShipToRule.update({ where: { id }, data });
    revalidatePath("/admin/direct-shipto-rules");
}
export async function deleteDirectRule(id: string) {
    await prisma.directShipToRule.delete({ where: { id } });
    revalidatePath("/admin/direct-shipto-rules");
}

// --- Threshold Rule (Singleton) ---
export async function saveThresholdRule(data: any) {
    // Upsert ID "1"
    const existing = await prisma.thresholdRule.findFirst();
    if (existing) {
        await prisma.thresholdRule.update({ where: { id: existing.id }, data });
    } else {
        await prisma.thresholdRule.create({ data: { ...data, id: '1' } });
    }
    revalidatePath("/admin/threshold-rule");
}

// --- Carriers ---
export async function createCarrier(data: any) {
    await prisma.carrier.create({ data });
    revalidatePath("/admin/carriers");
}
export async function deleteCarrier(id: string) {
    await prisma.carrier.delete({ where: { id } });
    revalidatePath("/admin/carriers");
}

// --- Calendar ---
export async function createCalendarEntry(data: any) {
    // data.date is expected to be Date object or ISO string
    await prisma.shippingCalendar.create({ data });
    revalidatePath("/admin/calendars");
}
export async function deleteCalendarEntry(id: string) {
    await prisma.shippingCalendar.delete({ where: { id } });
    revalidatePath("/admin/calendars");
}

// --- Lanes (Update) ---
export async function createLane(data: any) {
    // Validate or sanitize? Schema handles it mostly.
    await prisma.lane.create({ data });
    revalidatePath("/admin/lanes");
}

export async function updateLane(id: string, data: any) {
    await prisma.lane.update({ where: { id }, data });
    revalidatePath("/admin/lanes");
}
