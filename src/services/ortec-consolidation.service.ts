import { prisma } from "@/lib/db";
import { SalesOrder } from "@prisma/client";
import { createHash } from "crypto";

export class OrtecConsolidationService {
    /**
     * Generates a deterministic TPA Number Key based on ShipDate and ShipToId.
     * Format: TPA-{YYYYMMDD}-{Hash8}
     */
    static generateTpaKey(date: Date, shipToId: string, consignee: string): string {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}${mm}${dd}`;

        // Include Consignee in the Key
        const rawKey = `${shipToId}|${consignee.trim().toUpperCase()}`;
        const hash = createHash('sha256').update(rawKey).digest('hex').substring(0, 8).toUpperCase();
        return `TPA-${dateStr}-${hash}`;
    }

    /**
     * Determines TPA Numbers for a list of orders.
     * Does NOT update DB. Returns a map of OrderID -> Assigned TPA Number.
     * 
     * Rules:
     * 1. If Non-Consolidation: TPA-S-{OrderId} (Unique)
     * 2. If Consolidation Allowed: TPA-{Date}-{Hash(ShipTo + Consignee)} (Shared)
     */
    static assignTpaNumbers(orders: SalesOrder[]): Map<string, string> {
        const assignment = new Map<string, string>();

        for (const order of orders) {
            // Check flags
            // If isNonConsolidation=true or consolidationAllowed=false -> Individual
            // "Si una Sales Order tiene isNonConsolidation = true... asigna un tpaNumber exclusivo"

            const isIndividual = order.isNonConsolidation || !order.consolidationAllowed;

            if (isIndividual) {
                // Unique Deterministic Suffix
                // Using "S" for Single
                // TPA-S-{OrderId}
                assignment.set(order.id, `TPA-S-${order.sapSalesOrderNumber}`); // Using SAP Ref for readability if preferred, or ID
            } else {
                // Consolidated
                // Key: shipDate + shipToId + consignee
                const date = order.requestedShippingDate;
                const shipTo = order.shipToAddress;
                // @ts-ignore
                const consignee = order.consignee || ""; // Ensure string

                // Fallback if no shipto (shouldn't happen with seed logic)
                if (!shipTo) {
                    assignment.set(order.id, `TPA-MISSING-${order.sapSalesOrderNumber}`);
                    continue;
                }

                const tpaKey = this.generateTpaKey(date, shipTo, consignee);
                assignment.set(order.id, tpaKey);
            }
        }

        return assignment;
    }
}
