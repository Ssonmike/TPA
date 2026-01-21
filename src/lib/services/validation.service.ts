import {
    SalesOrder,
    CountryRule,
    SalesOrderStatus,
    ShippingType
} from '@prisma/client';
import { CONFIG } from '../config';

export class ValidationService {

    /**
     * Validates GROUPAGE orders against country restrictions.
     * If invalid -> ON_HOLD + holdReason.
     * Also checks Max LDM for groupage (if > 3 -> Direct?).
     */
    static validateGroupage(
        so: SalesOrder,
        countryRule: CountryRule | null
    ): { status: SalesOrderStatus; holdReason?: string; shippingType: ShippingType } {

        // Only applies to GROUPAGE
        if (so.shippingType !== ShippingType.GROUPAGE) {
            return { status: so.status, shippingType: so.shippingType };
        }

        // 1. Check Global Groupage LDM Limit
        // "Si so.loadingMeters > GROUPAGE_LDM_MAX -> cambiar a DIRECT_LTL"
        if (so.loadingMeters.toNumber() > CONFIG.GROUPAGE_LDM_MAX) {
            return {
                status: SalesOrderStatus.OPEN,
                shippingType: ShippingType.DIRECT_LTL
            };
        }

        // 2. Country Specific Restrictions
        if (countryRule) {
            if (countryRule.maxHeight && so.height.gt(countryRule.maxHeight)) {
                return {
                    status: SalesOrderStatus.ON_HOLD,
                    holdReason: `${countryRule.restrictionCode}: Max Height ${countryRule.maxHeight}m exceeded`,
                    shippingType: so.shippingType
                };
            }

            if (countryRule.maxPallets && so.pallets > countryRule.maxPallets) {
                return {
                    status: SalesOrderStatus.ON_HOLD,
                    holdReason: `${countryRule.restrictionCode}: Max Pallets ${countryRule.maxPallets} exceeded`,
                    shippingType: so.shippingType
                };
            }

            if (countryRule.maxVolumeM3 && so.volumeM3.gt(countryRule.maxVolumeM3)) {
                return {
                    status: SalesOrderStatus.ON_HOLD,
                    holdReason: `${countryRule.restrictionCode}: Max Volume ${countryRule.maxVolumeM3}m3 exceeded`,
                    shippingType: so.shippingType
                };
            }

            if (countryRule.maxLDM && so.loadingMeters.gt(countryRule.maxLDM)) {
                return {
                    status: SalesOrderStatus.ON_HOLD,
                    holdReason: `${countryRule.restrictionCode}: Max LDM ${countryRule.maxLDM}m exceeded`,
                    shippingType: so.shippingType
                };
            }
        }

        // Valid
        return { status: SalesOrderStatus.OPEN, shippingType: ShippingType.GROUPAGE };
    }
}
