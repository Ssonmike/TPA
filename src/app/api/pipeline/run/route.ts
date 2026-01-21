import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ClassificationService } from '@/lib/services/classification.service';
import { ValidationService } from '@/lib/services/validation.service';
import { GroupingService } from '@/lib/services/grouping.service';
import { TotalsService } from '@/lib/services/totals.service';
import { SalesOrderStatus, ShippingType, TPAGroupStatus } from '@prisma/client';

export async function POST(req: NextRequest) {
    try {
        const { action } = await req.json(); // e.g., 'full_run'

        // 1. Fetch Master Data
        const parcelRules = await prisma.parcelRule.findMany();
        const directRules = await prisma.directShipToRule.findMany({ where: { active: true } });
        const countryRules = await prisma.countryRule.findMany();

        // 2. Fetch Open/Unprocessed Orders
        // We process OPEN orders that are not yet GROUPED or are in a state allowing re-calc
        const orders = await prisma.salesOrder.findMany({
            where: {
                status: { in: [SalesOrderStatus.OPEN, SalesOrderStatus.ON_HOLD] },
                tpaGroupId: null
            }
        });

        let classifiedCount = 0;
        let groupedCount = 0;

        // 3. Classify & Validate
        for (const so of orders) {
            // Classify
            const classification = ClassificationService.classifySalesOrder(so, parcelRules, directRules);

            // Update object in memory for validation step
            const classifiedSo = { ...so, ...classification }; // simple merge

            // Validate (only if Groupage, but service handles checks)
            // We need to pass the specific country rule
            const cRule = countryRules.find(r => r.country === so.country) || null;
            const validation = ValidationService.validateGroupage(classifiedSo as any, cRule);

            // Save to DB
            await prisma.salesOrder.update({
                where: { id: so.id },
                data: {
                    shippingType: classification.shippingType,
                    status: validation.status,
                    holdReason: validation.holdReason || null // or classification.holdReason
                }
            });
            classifiedCount++;
        }

        // 4. Grouping (Simple pass)
        // Fetch again to get updated statuses (OPEN only)
        const openOrders = await prisma.salesOrder.findMany({
            where: {
                status: SalesOrderStatus.OPEN,
                tpaGroupId: null
                // parcel? shippingType != PARCEL usually
            }
        });

        // Grouping Strategy:
        // Iterate, generate Key.
        // Map<Key, Orders[]>
        const groupsMap = new Map<string, string[]>();

        for (const so of openOrders) {
            // Skip Parcel for grouping in this MVP?
            if (so.shippingType === ShippingType.PARCEL) continue;

            const key = GroupingService.generateGroupKey(so);
            if (key) {
                const existing = groupsMap.get(key) || [];
                existing.push(so.id);
                groupsMap.set(key, existing);
            }
        }

        // Process Groups
        for (const [key, soIds] of groupsMap.entries()) {
            if (soIds.length === 0) continue;

            // Create new TPAGroup
            // Ref format: DEL-YYYYMMDD-#### or based on Key
            const randomRef = `DEL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 10000)}`;

            // We need to determine group properties from the first order or aggregates
            // We'll create it empty then use TotalsService?
            // Or Create with initial data.

            // For MVP, create group, link orders, then calling TotalsService is cleaner.
            // But TotalsService needs the group with orders.

            const tpaGroup = await prisma.tpaGroup.create({
                data: {
                    tpaReference: randomRef,
                    status: TPAGroupStatus.OPEN,
                    shippingType: ShippingType.GROUPAGE, // Placeholder, updated by stats
                    totalVolumeM3: 0,
                    totalWeight: 0,
                    totalPallets: 0,
                    totalLDM: 0,
                    destinationCountry: 'XX', // Placeholder
                    destinationCity: 'XX',
                    destinationZipCode: 'XX'
                }
            });

            // Link Orders
            await prisma.salesOrder.updateMany({
                where: { id: { in: soIds } },
                data: {
                    tpaGroupId: tpaGroup.id,
                    status: SalesOrderStatus.GROUPED
                }
            });

            // Recalc Totals
            const groupWithOrders = await prisma.tpaGroup.findUnique({
                where: { id: tpaGroup.id },
                include: { salesOrders: true }
            });

            if (groupWithOrders) {
                const updates = TotalsService.recalcTPAGroup(groupWithOrders as any);
                await prisma.tpaGroup.update({
                    where: { id: tpaGroup.id },
                    data: updates
                });
            }

            groupedCount++;
        }

        return NextResponse.json({
            success: true,
            classified: classifiedCount,
            groupsCreated: groupedCount
        });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
