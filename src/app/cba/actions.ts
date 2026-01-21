"use server"

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function acceptShipmentAction(orderId: string) {
    try {
        await prisma.salesOrder.update({
            where: { id: orderId },
            data: { status: 'ACCEPTED' }
        });
        revalidatePath('/cba');
        revalidatePath('/direct');
        return { success: true };
    } catch (error) {
        console.error("Failed to accept shipment", error);
        return { success: false, message: "Failed to accept" };
    }
}

export async function rejectShipmentAction(orderId: string) {
    try {
        await prisma.salesOrder.update({
            where: { id: orderId },
            data: { status: 'REJECTED' }
        });
        revalidatePath('/cba');
        revalidatePath('/direct');
        return { success: true };
    } catch (error) {
        console.error("Failed to reject shipment", error);
        return { success: false, message: "Failed to reject" };
    }
}

export async function requestConsolidationAction(orderIds: string[]) {
    try {
        await prisma.salesOrder.updateMany({
            where: { id: { in: orderIds } },
            data: { status: 'CONSOLIDATION_REQUESTED' }
        });
        revalidatePath('/cba');
        revalidatePath('/direct');
        return { success: true };
    } catch (error) {
        console.error("Failed to request consolidation", error);
        return { success: false, message: "Failed to request consolidation" };
    }
}

export async function updateAppointmentAction(
    orderId: string,
    data: {
        actualPickupDate?: Date,
        pickUpTime?: string,
        confirmedDeliveryDate?: Date,
        confirmedDeliveryTime?: string
    }
) {
    try {
        const updateData: any = { ...data };
        let newStatus = '';

        // Workflow Logic (Single)
        if (data.confirmedDeliveryDate) {
            updateData.status = 'APT_BOOKED';
            newStatus = 'APT. BOOKED';
        } else if (data.actualPickupDate) {
            updateData.status = 'APT_RESERVED';
            newStatus = 'APT. RESERVED';
        }

        await prisma.salesOrder.update({
            where: { id: orderId },
            data: updateData
        });

        // Log Event
        const dateDesc = data.confirmedDeliveryDate ? `Delivery Date updated to ${data.confirmedDeliveryDate.toLocaleDateString()}` :
            (data.actualPickupDate ? `Pick Up Date updated to ${data.actualPickupDate.toLocaleDateString()}` : 'Date updated');

        const logMessage = `User updated ${dateDesc.replace('updated to', 'to')}. Status changed to ${newStatus}`;

        await EventLogService.log('SALES_ORDER', orderId, 'APP_DATE_UPDATE', {
            message: logMessage,
            fields: Object.keys(data)
        }, 'CARRIER');

        revalidatePath('/cba');
        // revalidatePath('/direct'); // Maybe update planner view too
        return { success: true };
    } catch (error) {
        console.error("Failed to update appointment", error);
        return { success: false, message: "Update failed" };
    }
}

import { EventLogService } from "@/services/event-log.service";

export async function updateBulkAppointmentAction(
    orderIds: string[],
    data: {
        actualPickupDate?: Date,
        pickUpTime?: string,
        confirmedDeliveryDate?: Date,
        confirmedDeliveryTime?: string
    }
) {
    try {
        const updateData: any = { ...data };
        let newStatus = '';

        // Workflow Logic
        if (data.confirmedDeliveryDate) {
            updateData.status = 'APT_BOOKED';
            newStatus = 'APT. BOOKED';
        } else if (data.actualPickupDate) {
            updateData.status = 'APT_RESERVED';
            newStatus = 'APT. RESERVED';
        }

        await prisma.salesOrder.updateMany({
            where: { id: { in: orderIds } },
            data: updateData
        });

        // Log Event Per Order
        const dateDesc = data.confirmedDeliveryDate ? `Delivery Date set to ${new Date(data.confirmedDeliveryDate).toLocaleDateString()} ${data.confirmedDeliveryTime || ''}` :
            (data.actualPickupDate ? `Pick Up Date set to ${new Date(data.actualPickupDate).toLocaleDateString()} ${data.pickUpTime || ''}` : 'Date updated');

        const logMessage = `Bulk Update: ${dateDesc.trim()}. Status: ${newStatus}`;

        // Create logs in parallel
        // Create logs in parallel
        const logs = await Promise.all(orderIds.map(id =>
            EventLogService.log('SALES_ORDER', id, 'APP_DATE_UPDATE', {
                message: logMessage,
                fields: Object.keys(data)
            }, 'CARRIER')
        ));

        revalidatePath('/cba');
        return { success: true, logsCreated: logs.length };
    } catch (error) {
        console.error("Failed to update bulk appointment", error);
        return { success: false, message: "Update failed" };
    }
}

export async function bulkStatusAction(orderIds: string[], status: 'ACCEPTED' | 'REJECTED' | 'BOOKING_CONFIRMED') {
    try {
        // User Requirement: Accept -> PLANNED (Visual) -> TPA ACCEPTED.
        // If status is ACCEPTED, we treat it as the final step.

        await prisma.salesOrder.updateMany({
            where: { id: { in: orderIds } },
            data: { status }
        });

        // Log Event Per Order
        const actionTime = new Date().toLocaleString("es-ES");
        const displayStatus = status === 'ACCEPTED' ? 'PLANNED' : status;

        await Promise.all(orderIds.map(id =>
            EventLogService.log('SALES_ORDER', id, 'STATUS_CHANGE', {
                message: `Status changed to ${displayStatus}. Action taken at ${actionTime}`,
                previousStatus: 'APT_RESERVED/BOOKED' // Context
            }, 'CARRIER')
        ));

        revalidatePath('/cba');
        return { success: true };
    } catch (error) {
        console.error("Failed to update bulk status", error);
        return { success: false, message: "Failed" };
    }
}

export async function fetchEventLogsAction(entityIds: string[]) {
    try {
        const logs = await prisma.eventLog.findMany({
            where: {
                entityId: { in: entityIds }
            },
            orderBy: { createdAt: 'desc' }
        });
        return { success: true, data: logs };
    } catch (error) {
        console.error("Failed to fetch logs", error);
        return { success: false, data: [] };
    }
}
