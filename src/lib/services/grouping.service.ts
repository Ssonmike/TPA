import {
    SalesOrder,
    TPAGroup,
    ShippingType,
    SalesOrderStatus,
    TPAGroupStatus,
    PrismaClient
} from '@prisma/client';
import { CONFIG } from '../config';

const prisma = new PrismaClient(); // Note: usually inject or singleton, but stub here.

export class GroupingService {

    /**
     * Main Grouping Logic.
     * - GROUPAGE: Group by Country + Date (optional)
     * - DIRECT_LTL: Group by Country+Zip+City+Customer+VAS
     */
    static generateGroupKey(so: SalesOrder): string | null {
        if (so.status !== SalesOrderStatus.OPEN || so.tpaGroupId) return null;

        if (so.shippingType === ShippingType.GROUPAGE) {
            // Group by Country.
            // Date? Prompt says: "opcional requestedShippingDate por día".
            // Let's include date to be precise: Country_YYYYMMDD
            const dateStr = so.requestedShippingDate.toISOString().split('T')[0];
            return `GRP_${so.country}_${dateStr}`;
        }

        if (so.shippingType === ShippingType.DIRECT_LTL) {
            // Country + Zip + Customer + City + VAS
            const vas = so.vasCode || 'NONE';
            return `DIR_${so.country}_${so.zipCode}_${so.customerId}_${so.city}_${vas}`;
        }

        // DIRECT_FTL, PARCEL -> No auto grouping?
        // Prompt: "DIRECT_FTL: crea TPAGroup 1:1".
        // We can handle that in a separate pass or here.
        if (so.shippingType === ShippingType.DIRECT_FTL) {
            return `FTL_${so.id}`; // Unique per SO
        }

        return null;
    }

    // Actual grouping logic would involve querying DB for existing Open Groups with this Key?
    // Since TPAGroup doesn't have a "Key" field strictly, we might need to search or create.
    // We can store the key in `finalReference` temp or infer it.
    // For this MVP, we might iterate OPEN orders and match them.
}
