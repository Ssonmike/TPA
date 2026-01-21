import {
    SalesOrder,
    ParcelRule,
    DirectShipToRule,
    ShippingType,
    CountryRule,
    SalesOrderStatus
} from '@prisma/client';
import { CONFIG } from '../config';

export class ClassificationService {

    /**
     * Main classification logic.
     * Order:
     * 1. PARCEL Rules
     * 2. DIRECT FORCE (Customer/Address specific)
     * 3. 105 Inch Model -> Direct
     * 4. Thresholds (Volume)
     */
    static classifySalesOrder(
        so: SalesOrder,
        parcelRules: ParcelRule[],
        directRules: DirectShipToRule[]
    ): { shippingType: ShippingType; status: SalesOrderStatus; holdReason?: string } {

        // 1. Parcel Check
        if (this.isParcel(so, parcelRules)) {
            return { shippingType: ShippingType.PARCEL, status: SalesOrderStatus.OPEN };
        }

        // 2. Direct Force Check
        if (this.isForcedDirect(so, directRules)) {
            return { shippingType: ShippingType.DIRECT_LTL, status: SalesOrderStatus.OPEN };
        }

        // 3. 105 Inch Model Check
        if (so.is105InchModel) {
            return { shippingType: ShippingType.DIRECT_LTL, status: SalesOrderStatus.OPEN };
        }

        // 4. Thresholds
        return this.applyThresholds(so);
    }

    private static isParcel(so: SalesOrder, rules: ParcelRule[]): boolean {
        const countryRule = rules.find(r => r.country === so.country);

        // If explicit rule says "allowParcel = false", then NO.
        if (countryRule && !countryRule.allowParcel) return false;

        // If NO rule exists, assume allowed? Or blocked? 
        // Requirement says: "Si ParcelRule.allowParcel=false -> NO". 
        // Implication: If no rule, fallback to defaults or allowed. 
        // Let's assume allowed if undefined, but check physical limits if rule exists.

        // Global or Default limits if no specific rule?
        // Requirement: "Si maxWeight y so.weight > maxWeight -> NO"
        // Use rule limits if present.

        if (countryRule) {
            if (countryRule.forbiddenVasCodes && so.vasCode) {
                const forbidden = countryRule.forbiddenVasCodes.split(',').map(s => s.trim());
                if (forbidden.includes(so.vasCode)) return false;
            }
            if (countryRule.maxWeight && so.weight.gt(countryRule.maxWeight)) return false;
            if (countryRule.maxVolumeM3 && so.volumeM3.gt(countryRule.maxVolumeM3)) return false;
            if (countryRule.maxHeight && so.height.gt(countryRule.maxHeight)) return false;
        }

        // Note: If no rule, do we assume it IS parcel? 
        // Usually Parcel logic has "must be small enough". 
        // Without global definition of "What is a parcel", we might over-classify.
        // Prompt says: "Si pasa todas las reglas -> PARCEL".
        // I will add a safe hardcoded limit if no rule matches?
        // "Tests mínimos". I'll stick to: if matches CountryRule constraints. 
        // But what if NO rule? I'll assume NOT parcel if no rule is found for country, 
        // OR return false to be safe (Groupage default).
        // Let's assume: Must have a rule to be Parcel enabled?
        // Prompt: "Si ParcelRule.allowParcel=false ... Si maxWeight...".
        // I will assume if rule exists -> check it. If no rule -> false (safe).
        if (!countryRule) return false;

        return true;
    }

    private static isForcedDirect(so: SalesOrder, rules: DirectShipToRule[]): boolean {
        // Find matching active rule
        const rule = rules.find(r =>
            r.active &&
            r.country === so.country &&
            r.customerId === so.customerId &&
            r.shipToId === so.shipToAddress // Using shipToAddress as shipToId reference per schema? 
            // Schema says: SalesOrder.shipToAddress (string) and DirectShipToRule.shipToId (string).
            // Prompt says: "shipToId (referencia externa)" in Customer.
            // SalesOrder has shipToAddress... I will match so.shipToAddress to rule.shipToId 
            // or should I use Customer info? so.customerId is on SO.
            // I will assume so.shipToAddress holds the ID or key.
        );

        return rule ? rule.forceDirect : false;
    }

    private static applyThresholds(so: SalesOrder): { shippingType: ShippingType; status: SalesOrderStatus } {
        const vol = so.volumeM3.toNumber(); // Decimal to number

        if (vol >= CONFIG.FTL_VOL_M3) {
            return { shippingType: ShippingType.DIRECT_FTL, status: SalesOrderStatus.OPEN };
        }

        if (vol >= CONFIG.DIRECT_VOL_M3) {
            return { shippingType: ShippingType.DIRECT_LTL, status: SalesOrderStatus.OPEN };
        }

        return { shippingType: ShippingType.GROUPAGE, status: SalesOrderStatus.OPEN };
    }
}
