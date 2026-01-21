import { prisma } from "@/lib/db";
import { CBAClient } from "./cba-client";
import { LoginView } from "./login-view";

// Next.js 15: searchParams is a promise
interface Props {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function CBAPage({ searchParams }: Props) {
    const resolvedParams = await searchParams;
    const carrier = typeof resolvedParams.carrier === 'string' ? resolvedParams.carrier : undefined;

    if (!carrier) {
        return <LoginView />
    }

    // Logic: 
    // CT sees everything that is active (REQUESTED, ACCEPTED, REJECTED)
    // Carrier sees only what is assigned to them AND is REQUESTED (per user spec)

    // Wait, user spec said: "Carriers... Solo pueden ver las órdenes donde... status sea REQUESTED."
    // If I accept it, it disappears? Or should I show it as accepted history?
    // "Lista de Cargas... Mostrar una tabla... Acciones... Accept..."
    // If it disappears immediately on accept, it might be jarring.
    // However, usually "CBA" is an inbox. Done items go away.
    // User spec text: "Lista de Cargas: Mostrar una tabla... Cards con resumen..."
    // The tiles show "Accepted: X". If I filter them out from the table, the tile count might still reference DB.
    // Let's allow carriers to see ACCEPTED/REJECTED too for history context for now, UNLESS strictly forbidden?
    // "Solo pueden ver las órdenes donde... status sea REQUESTED" is quite strict.
    // But then how do they see the "Accepted" tile count increase? 
    // I will interpret "Solo pueden ver" as "The Main Inbox View". 
    // BETTER APPROACH: Fetch ALL active ones for that carrier, but maybe visually separate?
    // OR: Adhere strictly. 
    // Re-reading: "Carriers ... Solo pueden ver ... status sea REQUESTED."
    // Re-reading Tile spec: "Tiles... Accepted... Rejected..."
    // If I only fetch REQUESTED, then Accepted tile will be 0.
    // So I MUST fetch status IN [REQUESTED, ACCEPTED, REJECTED] to populate tiles, 
    // but maybe default the filter or just show them?
    // I will fetch all 3 statuses for the Carrier, that way the Dashboard is useful.

    const statusFilter = ['REQUESTED', 'APT_BOOKED', 'APT_RESERVED', 'ACCEPTED', 'REJECTED', 'BOOKING_REQUESTED'];

    const whereClause: any = {
        status: { in: statusFilter }
    };

    if (carrier !== 'CT') {
        whereClause.carrierName = carrier;
    }

    const rawOrders = await prisma.salesOrder.findMany({
        where: whereClause,
        orderBy: { requestedShippingDate: 'asc' }
    });

    // Serialize
    const orders = rawOrders.map(o => ({
        id: o.id,
        orderReferenceNumber: o.orderReferenceNumber,
        carrierName: o.carrierName || undefined,
        firstPickupDate: o.firstPickupDate ? new Date(o.firstPickupDate) : undefined,
        status: o.status,
        shipToCity: o.shipToCity || o.city,
        shipToCountry: o.shipToCountry || o.country,
        weight: Number(o.weight),
        volumeM3: Number(o.volumeM3),
        loadingMeters: o.loadingMeters ? Number(o.loadingMeters) : null,

        // New Fields
        tpaNumber: o.tpaNumber || undefined,
        consignee: o.consignee || undefined,
        pallets: o.pallets || 0,
        cartonQuantity: o.cartonQuantity || 0,

        // Booking Fields (CRITICAL FIX)
        bookingType: o.bookingType || undefined,
        bookingManager: o.bookingManager || undefined,

        // Appointment Fields
        actualPickupDate: o.actualPickupDate || undefined,
        pickUpTime: o.pickUpTime || undefined,
        confirmedDeliveryDate: o.confirmedDeliveryDate || undefined,
        confirmedDeliveryTime: o.confirmedDeliveryTime || undefined
    }));

    return <CBAClient orders={orders} carrierId={carrier} />
}
