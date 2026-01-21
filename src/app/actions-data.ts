"use server"

import { prisma } from "@/lib/db";
import { LaneService } from "@/services/lane.service";

// Orders
// Orders
export async function fetchSalesOrders() {
    // 1. Fetch Ungrouped Orders
    const ungroupedOrders = await prisma.salesOrder.findMany({
        where: { tpaGroupId: null },
        orderBy: { requestedShippingDate: 'asc' },
        take: 500
    });

    // 1b. Group "Ungrouped" orders by TPA Number (Virtual Grouping)
    const tpaGroups = new Map<string, typeof ungroupedOrders>();
    const singles: typeof ungroupedOrders = [];

    for (const order of ungroupedOrders) {
        if (order.tpaNumber) {
            if (!tpaGroups.has(order.tpaNumber)) {
                tpaGroups.set(order.tpaNumber, []);
            }
            tpaGroups.get(order.tpaNumber)!.push(order);
        } else {
            singles.push(order);
        }
    }

    // Create Virtual Header Rows for TPA Groups
    const virtualTpaRows = Array.from(tpaGroups.entries()).map(([tpaNum, orders]) => {
        // Representative order (first one)
        const rep = orders[0];
        const isConsolidated = orders.length > 1;

        // Calculate Totals
        const totalVol = orders.reduce((sum, o) => sum + Number(o.volumeM3), 0);
        const totalWgt = orders.reduce((sum, o) => sum + Number(o.weight), 0);

        // Use Consolidated Totals from Schema if available, else sum
        const tpaPallets = rep.tpaTotalPallets ?? orders.reduce((sum, o) => sum + (o.pallets ?? 0), 0);
        const tpaLdm = rep.tpaTotalLdm ?? orders.reduce((sum, o) => sum + Number(o.loadingMeters ?? 0), 0);

        return {
            id: `TPA-VIRTUAL-${tpaNum}`,
            // Header Info
            tpaNumber: tpaNum,
            tpaNumberSoCount: orders.length,
            orderReferenceNumber: "", // User requested empty Reference for Group Header

            // Shared Info
            requestedShippingDate: rep.requestedShippingDate,
            shipToAddress: rep.shipToAddress, // Show ShipTo on Header
            country: rep.country,
            zipCode: rep.zipCode,
            city: rep.city,

            // Metrics
            cartonQuantity: orders.reduce((sum, o) => sum + o.cartonQuantity, 0),
            volumeM3: totalVol,
            weight: totalWgt,
            pallets: Number(tpaPallets),
            tpaTotalPallets: Number(tpaPallets),
            loadingMeters: Number(tpaLdm),
            tpaTotalLdm: Number(tpaLdm),

            // Booking Aggregation
            bookingType: (() => {
                // @ts-ignore
                const types = Array.from(new Set(orders.map(o => o.bookingType || "STD")));
                return types.length === 1 ? types[0] : "MIX";
            })(),
            bookingManager: (() => {
                // Only really relevant if APT, but generic calculation
                // If types are mixed, manager might be ambiguous, but let's calc anyway
                // @ts-ignore
                const mgrs = Array.from(new Set(orders.map(o => o.bookingManager || "CARRIER")));
                return mgrs.length === 1 ? mgrs[0] : "MIX";
            })(),

            status: rep.status, // Standardize Status
            shippingType: rep.shippingType,

            // Sub Rows
            subRows: orders.map(o => ({
                ...o,
                volumeM3: Number(o.volumeM3),
                weight: Number(o.weight),
                loadingMeters: o.loadingMeters ? Number(o.loadingMeters) : null,
                ldmAllocated: o.ldmAllocated ? Number(o.ldmAllocated) : null,
                tpaTotalPallets: o.tpaTotalPallets,
                tpaTotalLdm: o.tpaTotalLdm ? Number(o.tpaTotalLdm) : null
            })),

            isGroupHeader: true,
            isTpaHeader: true // Distinguish from TPAGroup
        };
    });

    // 2. Fetch Groups (Existing Logic for TPA Groups)
    const groups = await prisma.tPAGroup.findMany({
        where: { status: { not: 'CANCELLED' } },
        include: { salesOrders: true },
        orderBy: { shipDate: 'asc' }
    });

    // 3. Transform Groups (Existing Logic)
    const groupRows = groups.map(g => ({
        id: g.id,
        orderReferenceNumber: `Group: ${g.groupNo || "N/A"} (${g.salesOrders.length} orders)`,
        requestedShippingDate: g.shipDate,
        shipToName: "MULTIPLE",
        country: "MIX",
        zipCode: "",
        city: "",
        cartonQuantity: g.ordersCount,
        volumeM3: Number(g.totalVolumeM3),
        weight: Number(g.totalWeight),
        loadingMeters: Number(g.totalLDM),
        pallets: Number(g.totalPallets),
        status: g.status,
        shippingType: g.shippingType,
        subRows: g.salesOrders.map(o => ({
            ...o,
            volumeM3: Number(o.volumeM3),
            weight: Number(o.weight),
            loadingMeters: o.loadingMeters ? Number(o.loadingMeters) : null
        })),
        isGroupHeader: true
    }));

    // 4. Combine and Sort
    const combined = [
        ...singles.map(o => ({
            ...o,
            volumeM3: Number(o.volumeM3),
            weight: Number(o.weight),
            loadingMeters: o.loadingMeters !== null ? Number(o.loadingMeters) : null,
            ldmAllocated: o.ldmAllocated ? Number(o.ldmAllocated) : null,
            tpaTotalPallets: o.tpaTotalPallets,
            tpaTotalLdm: o.tpaTotalLdm ? Number(o.tpaTotalLdm) : null
        })),
        ...virtualTpaRows,
        ...groupRows
    ].sort((a, b) => {
        if (!a.requestedShippingDate || !b.requestedShippingDate) return 0;
        const dA = new Date(a.requestedShippingDate).getTime();
        const dB = new Date(b.requestedShippingDate).getTime();
        return dA - dB;
    });

    return JSON.parse(JSON.stringify(combined));
}

// KPIs
export async function fetchKPIs() {
    // We need to adhere to KpiStats interface
    // { direct: {..}, groupage: {..}, parcels: {..}, blocked: {..}, openWorkload: {..}, capacity: {..} }

    const orders = await prisma.salesOrder.findMany(); // MVP: Fetch all to agg in memory (fast enough for <10k)

    // Init Stats
    const stats = {
        direct: { orders: 0, pallets: 0, pieces: 0 },
        groupage: { orders: 0, pallets: 0, pieces: 0 },
        parcels: { orders: 0, pieces: 0 },
        blocked: { orders: 0 },
        openWorkload: { orders: 0 },
        capacity: { remaining: 10000, total: 10000 }
    };

    let usedPieces = 0;

    for (const o of orders) {
        if (o.status === 'CANCELLED' || o.status === 'RECEIVED') continue;

        const isDirect = o.shippingType?.includes('DIRECT');
        const isGroupage = o.shippingType === 'GROUPAGE';
        const isParcel = o.shippingType === 'PARCEL';
        const isBlocked = o.status === 'ON_HOLD' || o.status === 'BLOCKED';
        const isOpen = o.status === 'OPEN'; // Or others?

        if (isDirect) {
            stats.direct.orders++;
            stats.direct.pallets += Number(o.pallets || 0);
            stats.direct.pieces += o.cartonQuantity;
        }
        if (isGroupage) {
            stats.groupage.orders++;
            stats.groupage.pallets += Number(o.pallets || 0);
            stats.groupage.pieces += o.cartonQuantity;
        }
        if (isParcel) {
            stats.parcels.orders++;
            stats.parcels.pieces += o.cartonQuantity;
        }
        if (isBlocked) {
            stats.blocked.orders++;
        }
        if (isOpen) {
            stats.openWorkload.orders++;
        }

        // Capacity Logic: User requested 10,000 PCS Capacity.
        // But ONLY counts against capacity if "Calculated" (LDM > 0).
        if (o.loadingMeters && Number(o.loadingMeters) > 0) {
            usedPieces += o.cartonQuantity;
        }
    }

    stats.capacity.remaining = Math.max(0, stats.capacity.total - usedPieces);

    return stats;
}

// Lanes
export async function fetchLaneDataAction() {
    // This returns the heavy nested structure
    const data = await LaneService.getLaneBoardData();
    return JSON.parse(JSON.stringify(data));
}

// Groups
export async function fetchTPAGroups() {
    const groups = await prisma.tPAGroup.findMany({
        orderBy: { createdAt: 'desc' },
        include: { salesOrders: false } // Optimize
    });
    return JSON.parse(JSON.stringify(groups));
}

// Trucks
export async function fetchTruckGroups() {
    const trucks = await prisma.truckGroup.findMany({
        orderBy: { createdAt: 'desc' }
    });
    return JSON.parse(JSON.stringify(trucks));
}
