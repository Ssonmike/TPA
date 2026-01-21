import { TPAGroup, TruckGroup, SalesOrder, ShippingType } from '@prisma/client';
import { CONFIG } from '../config';

export class TotalsService {

    static recalcTPAGroup(group: TPAGroup & { salesOrders: SalesOrder[] }): Partial<TPAGroup> {
        const orders = group.salesOrders;

        if (orders.length === 0) {
            // Reset if empty, or should be deleted?
            return {
                totalVolumeM3: 0 as any, // Decimal needs handling
                totalWeight: 0 as any,
                totalPallets: 0,
                totalLDM: 0 as any,
                // shippingType?
            };
        }

        // Sums
        let vol = 0;
        let weight = 0;
        let pallets = 0;
        let ldm = 0;

        for (const so of orders) {
            vol += Number(so.volumeM3);
            weight += Number(so.weight);
            pallets += so.pallets;
            ldm += Number(so.loadingMeters);
        }

        // Determine Group Type
        // Logic: 
        // - Any DIRECT_FTL -> DIRECT_FTL? (Should not happen if validation prevents mixing)
        // - Any DIRECT_LTL -> DIRECT_LTL?
        // - Else GROUPAGE.

        // For mixing:
        const types = orders.map(o => o.shippingType);
        let groupType = ShippingType.GROUPAGE;

        if (types.includes(ShippingType.DIRECT_FTL)) groupType = ShippingType.DIRECT_FTL;
        else if (types.includes(ShippingType.DIRECT_LTL)) groupType = ShippingType.DIRECT_LTL;
        else if (types.every(t => t === ShippingType.PARCEL)) groupType = ShippingType.PARCEL;

        // Destinations from 1st SO (assuming grouped by dest)
        const first = orders[0];

        return {
            totalVolumeM3: vol as any, // In real code, use Decimal
            totalWeight: weight as any,
            totalPallets: pallets,
            totalLDM: ldm as any,
            shippingType: groupType,
            destinationCountry: first.country,
            destinationZipCode: first.zipCode, // Only valid if grouped by zip
            destinationCity: first.city
        };
    }

    static recalcTruckGroup(truck: TruckGroup & { tpaGroups: TPAGroup[] }): Partial<TruckGroup> {
        const groups = truck.tpaGroups;

        let vol = 0;
        let weight = 0;
        let pallets = 0;
        let ldm = 0;

        for (const g of groups) {
            vol += Number(g.totalVolumeM3);
            weight += Number(g.totalWeight);
            pallets += g.totalPallets;
            ldm += Number(g.totalLDM);
        }

        return {
            truckTotalVolume: vol as any,
            truckTotalWeight: weight as any,
            truckTotalPallets: pallets,
            truckTotalLDM: ldm as any
        };
    }
}
