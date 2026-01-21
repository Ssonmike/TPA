import {
    PrismaClient, SalesOrder, ShippingType, SalesOrderStatus, BlockReason
} from '@prisma/client';
import { prisma } from '@/lib/db';
import { EventLogService } from './event-log.service';

const VOLUME_THRESHOLD_FTL = 70; // From new ThresholdRule if available, using const for safe fallback
const VOLUME_THRESHOLD_DIRECT = 15.6;

export class ClassificationService {

    /**
     * Main pipeline to classify an order
     * Returning state for testing/logging
     */
    static async classifyOrder(orderId: string): Promise<any> {
        const order = await prisma.salesOrder.findUnique({
            where: { id: orderId },
            include: { customer: true }
        });

        if (!order) throw new Error(`Order ${orderId} not found`);

        let shippingType: ShippingType = ShippingType.GROUPAGE; // Default
        let status: SalesOrderStatus = SalesOrderStatus.OPEN;
        let blockReason: BlockReason | null = null;
        let blockDetails: string | null = null;

        // Fetch Rules
        // Fetch Rules
        // 1. Thresholds (Global)
        const thresholds = await prisma.thresholdRule.findFirst({ where: { id: '1' } });
        // Use constants as fallback if DB returns null/undefined, or if the value is 0 (which might be wrong)
        const limitFTL = (thresholds && Number(thresholds.minVolumeFTL) > 0) ? Number(thresholds.minVolumeFTL) : VOLUME_THRESHOLD_FTL;
        const limitDirect = (thresholds && Number(thresholds.minVolumeDirect) > 0) ? Number(thresholds.minVolumeDirect) : VOLUME_THRESHOLD_DIRECT;

        // 2. Direct Rule
        const directRule = await prisma.directShipToRule.findFirst({
            where: {
                shipToId: order.shipToAddress,
                active: true
            }
        });

        const vol = Number(order.volumeM3);
        const wgt = Number(order.weight);

        console.log(`[Classification] Order ${orderId} Vol=${vol}. Limits: Direct=${limitDirect}, FTL=${limitFTL}`);

        // --- Logic Tree ---

        // A. Direct Check (Forced)
        if (directRule?.forceDirect) {
            shippingType = ShippingType.DIRECT_LTL;
            if (vol >= limitFTL) {
                shippingType = ShippingType.DIRECT_FTL;
            }
        }
        // B. FTL Volume Check
        else if (vol >= limitFTL) {
            shippingType = ShippingType.DIRECT_FTL;
        }
        // C. Direct Volume Check
        // The user says ">= 15.6 is Direct".
        // Code said > 15.6. Let's fix to >=
        else if (vol >= limitDirect) {
            shippingType = ShippingType.DIRECT_LTL;
        }
        // D. Groupage vs Parcel
        else {
            // Parcel Check
            let isParcel = false;

            // If order is NOT non-consolidation (if flag exists)
            if (!order.isNonConsolidation) {
                const parcelRule = await prisma.parcelRule.findFirst({
                    where: { country: order.country, allowParcel: true }
                });

                if (parcelRule) {
                    const fitsWeight = !parcelRule.maxWeight || wgt <= Number(parcelRule.maxWeight);
                    const fitsVol = !parcelRule.maxVolumeM3 || vol <= Number(parcelRule.maxVolumeM3);

                    if (fitsWeight && fitsVol) {
                        isParcel = true;
                    } // Else could capture fail reason?
                } else {
                    // Check if handling block for Country Not Allowed?
                    // Spec: "Parcel si cumple allowedCountries"
                    // If country not in rule or allowParcel=false, it's NOT parcel.
                }
            }

            if (isParcel) {
                shippingType = ShippingType.PARCEL;
            } else {
                shippingType = ShippingType.GROUPAGE;
            }
        }

        // --- Validations & Blocking ---

        // 1. Lane Check for Groupage
        if (shippingType === ShippingType.GROUPAGE) {
            // "Lane resolution (determinista)"
            // Find first active lane containing country
            const lanes = await prisma.lane.findMany({
                where: { isActive: true },
                orderBy: { lanePriority: 'asc' }
            });

            const lane = lanes.find(l => l.countries.includes(order.country));

            if (!lane) {
                status = SalesOrderStatus.BLOCKED;
                blockReason = BlockReason.LANE_NOT_FOUND;
                blockDetails = `No active lane configured for country ${order.country}`;
            }
        }

        // 2. Master Data Check (Example)
        if (!order.shipToAddress || !order.country) {
            status = SalesOrderStatus.BLOCKED;
            blockReason = BlockReason.MISSING_MASTERDATA;
            blockDetails = "Missing ShipTo or Country";
        }

        // 3. Country Rule Checks (Dims)
        if (status === SalesOrderStatus.OPEN) {
            const countryRule = await prisma.countryRule.findFirst({ where: { country: order.country } });
            if (countryRule) {
                if (countryRule.maxHeight && Number(order.height) > Number(countryRule.maxHeight)) {
                    status = SalesOrderStatus.BLOCKED; // Spec says BLOCKED or ON_HOLD? Spec: "OPEN -> BLOCKED (por validación)"
                    blockReason = BlockReason.DIMENSION_LIMIT_EXCEEDED;
                    blockDetails = `Height ${order.height} > ${countryRule.maxHeight}`;
                }
                // ... other checks
            }
        }

        // --- Apply Updates ---

        // Only update if changed (Mock check) or just force update
        const updated = await prisma.salesOrder.update({
            where: { id: orderId },
            data: {
                shippingType,
                status,
                blockReason,
                blockDetails
            }
        });

        // Log
        await EventLogService.log('ORDER', orderId, 'CLASSIFIED', {
            oldStatus: order.status,
            newStatus: status,
            shippingType,
            reason: blockReason
        });

        // --- Booking Logic (New) ---
        // Post-classification assignment (or part of it)
        // Rule 1: Amazon -> APT + Carrier
        // Rule 2: Priority/AVIS -> AVIS
        // Fallback: STD

        // Default: Fallback to STD
        let bookingType = "STD";
        let bookingManager = "CARRIER";

        const consigneeHigh = (order.consignee || "").toUpperCase();
        // const instructions = (order.deliveryInstructions || "").toUpperCase(); // Deprecated or secondary

        // --- RULE 1: APPOINTMENT (APT) ---
        if (consigneeHigh.includes("AMAZON") || consigneeHigh.includes("BOL.COM")) {
            bookingType = "APT";
            bookingManager = "CARRIER";
        } else if (consigneeHigh.includes("TECHDATA")) {
            bookingType = "APT";
            bookingManager = "CT"; // Control Tower
        }
        // --- RULE 2: NOTIFY (AVIS) ---
        else if (consigneeHigh.includes("LOGISTICS CORP") || Number(order.weight) > 10000) {
            bookingType = "AVIS";
            // Manager usually CARRIER for AVIS unless specified
        }
        // --- RULE 3: STD (Default) ---
        else {
            bookingType = "STD";
        }

        // Persist Booking Info
        // We do this in a separate update or combine? 
        // Logic might require re-fetching if we want to be pure, but here we can just update again or add to the previous update if we refactor.
        // For minimal intrusion, let's update it.

        await prisma.salesOrder.update({
            where: { id: orderId },
            data: {
                bookingType,
                bookingManager
            }
        });

        // --- Status Override for Booking ---
        // Requirement: "Si una orden es APPOINTMENT y la gestiona Control Tower, el estado inicial debe ser BOOKING REQUESTED."
        // We do this after persisting the booking info (or we could have done it before).
        // Since we have orderId, let's just do a quick check and update if needed.
        if (bookingType === 'APT' && bookingManager === 'CT' && status !== SalesOrderStatus.BOOKING_REQUESTED) {
            await prisma.salesOrder.update({
                where: { id: orderId },
                data: { status: SalesOrderStatus.BOOKING_REQUESTED }
            });
            // Log override
            await EventLogService.log('ORDER', orderId, 'STATUS_CHANGE', {
                from: status,
                to: 'BOOKING_REQUESTED',
                reason: 'Booking Logic (APT/CT)'
            });
        }


        return updated;
    }

    /**
     * Bulk classify
     */
    static async classifyAllOpenOrders() {
        // Only classify OPEN orders (or specifically those needing re-eval)
        const orders = await prisma.salesOrder.findMany({
            where: { status: SalesOrderStatus.OPEN }
        });

        for (const order of orders) {
            await this.classifyOrder(order.id);
        }
    }
}
