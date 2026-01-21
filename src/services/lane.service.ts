import { prisma } from '@/lib/db';
import { TPAGroupStatus, TruckGroupStatus } from '@prisma/client';

export type DailyBucket = {
    date: Date;
    dateStr: string; // ISO key
    groups: any[];
    trucks: any[];
    metrics: {
        totalLDM: number;
        totalPallets: number;
        ordersCount: number;
    };
    hasOpenTrucks: boolean;
    hasPlannedItems: boolean;
}

export type LaneData = {
    laneId: string;
    laneName: string;
    buckets: DailyBucket[];
}

export class LaneService {
    static async getLaneBoardData(): Promise<LaneData[]> {
        const lanes = await prisma.lane.findMany({ where: { isActive: true }, orderBy: { lanePriority: 'asc' } });

        const result: LaneData[] = [];

        for (const lane of lanes) {
            // Fetch relevant Groups and Trucks for this Lane
            // We usually care about "Active" dates (ignoring old history for board?)
            // For MVP: Fetch all non-cancelled/received

            const groups = await prisma.tPAGroup.findMany({
                where: {
                    laneId: lane.id,
                    status: { not: TPAGroupStatus.CANCELLED }
                },
                include: { trucks: true, salesOrders: true }
            });

            // Group by Date
            const bucketMap = new Map<string, DailyBucket>();

            for (const g of groups) {
                if (!g.shipDate) continue;
                const dKey = g.shipDate.toISOString().split('T')[0];

                if (!bucketMap.has(dKey)) {
                    bucketMap.set(dKey, {
                        date: g.shipDate,
                        dateStr: dKey,
                        groups: [],
                        trucks: [],
                        metrics: { totalLDM: 0, totalPallets: 0, ordersCount: 0 },
                        hasOpenTrucks: false,
                        hasPlannedItems: false
                    });
                }

                const b = bucketMap.get(dKey)!;
                b.groups.push(g);

                // Aggregates
                b.metrics.totalLDM += Number(g.totalLDM);
                b.metrics.totalPallets += Number(g.totalPallets);
                b.metrics.ordersCount += g.ordersCount;

                if (g.status === TPAGroupStatus.PLANNED) b.hasPlannedItems = true;
            }

            // Also fetch trucks to list them?
            // Or infer trucks from groups?
            // Better to fetch trucks directly to see empty ones or fully loaded ones
            const trucks = await prisma.truckGroup.findMany({
                where: { laneId: lane.id },
                include: { tpaGroups: true }
            });

            for (const t of trucks) {
                if (!t.shipDate) continue;
                const dKey = t.shipDate.toISOString().split('T')[0];
                if (bucketMap.has(dKey)) {
                    bucketMap.get(dKey)!.trucks.push(t);
                    if (t.status === TruckGroupStatus.OPEN) bucketMap.get(dKey)!.hasOpenTrucks = true;
                }
            }

            // Sort buckets by date
            const sortedBuckets = Array.from(bucketMap.values()).sort((a, b) => a.date.getTime() - b.date.getTime());

            result.push({
                laneId: lane.id,
                laneName: lane.name,
                buckets: sortedBuckets
            });
        }

        return result;
    }
}
