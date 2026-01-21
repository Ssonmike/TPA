import { PrismaClient, SalesOrderStatus, ShippingType, Prisma } from '@prisma/client'
import { createHash } from 'crypto';
import { ClassificationService } from '../src/services/classification.service';

const prisma = new PrismaClient()

// Inline helper to avoid import path issues in seed
class ShipToIdHelper {
    static normalize(value: string | null | undefined): string {
        return value ? value.trim().toUpperCase() : '';
    }

    static generateShipToId(country: string, zip: string, city: string, street: string, houseNo: string): string {
        const nCountry = this.normalize(country);
        const nZip = this.normalize(zip).replace(/\s+/g, '');
        const nCity = this.normalize(city);
        const nStreet = this.normalize(street);
        const nHouse = this.normalize(houseNo);
        const key = `${nCountry}|${nZip}|${nCity}|${nStreet}|${nHouse}`;
        const hash = createHash('sha256').update(key).digest('hex').substring(0, 8).toUpperCase();
        return `SHIP-${nCountry}-${nZip}-${hash}`;
    }
}

const FIXED_DESTINATIONS = [
    { country: 'DE', zip: '47877', city: 'Willich', street: 'Siemensring', houseNo: '25' },
    { country: 'DE', zip: '20095', city: 'Hamburg', street: 'Mönckebergstr', houseNo: '7' },
    { country: 'AT', zip: '1010', city: 'Wien', street: 'Kärntner Str', houseNo: '12' },
    { country: 'AT', zip: '4020', city: 'Linz', street: 'Landstr', houseNo: '50' },
    { country: 'NL', zip: '5911', city: 'Venlo', street: 'Stationsplein', houseNo: '3' },
    { country: 'ES', zip: '28001', city: 'Madrid', street: 'Gran Via', houseNo: '10' },
    { country: 'FR', zip: '75001', city: 'Paris', street: 'Rue de Rivoli', houseNo: '5' },
    { country: 'IT', zip: '00100', city: 'Roma', street: 'Via del Corso', houseNo: '100' },
];

// UI Enhancement Helpers
const CITY_INITIALS_MAP: Record<string, string[]> = {
    'DE': ['BE', 'MU', 'HH', 'FR', 'KO', 'DU'],
    'NL': ['AM', 'RT', 'UT', 'EI', 'GR'],
    'AT': ['VI', 'SZ', 'LZ', 'IN'],
    'ES': ['MA', 'BC', 'VA', 'SE'],
    'FR': ['PA', 'LY', 'MA', 'NI'],
    'CH': ['ZU', 'GE', 'BS', 'BE'],
    'PL': ['WA', 'KR', 'WR', 'PO'],
    'IT': ['RM', 'MI', 'NA', 'TO'],
    'DEFAULT': ['CT', 'XX', 'YY']
};


const CONSIGNEES_BY_COUNTRY: Record<string, string[]> = {
    'DE': ['JARLTECH EUROPE GMBH', 'TAROX AG', 'Bluechip', 'Systeam GMBH', 'ALSO DE', 'Ingram Micro'],
    'FR': ['INGRAM MICRO SAS', 'ENTREPOT DARTY', 'KUEHNE+NAGEL', 'EUROP COMPUTER PERFORMANCE', 'VTM/MCA', 'AMAZON XOR4'],
    'ES': ['TD SYNNEX SPAIN S.L.U.', 'MCR INFO ELECTRONIC', 'MAD6 AMAZON'],
    'IT': ['TD SYNNEX ITALY S.R.L.', 'COMPUTER GROSS S.P.A.'],
    'GB': ['MIDWICH LTD', 'INGRAM MICRO UK', 'TD SYNNEX UK', 'SPORTSDIRECT.COM'],
    'NL': ['Bol.com', 'Coolblue', 'Alternate', 'Also NL'],
    'BE': ['Bol.com', 'Coolblue', 'Alternate', 'Also NL'], // Assuming Benelux sharing
    'DEFAULT': ['Global Tech', 'Logistics Corp', 'Retail Chain A', 'Office Depot']
};

const DELIVERY_INSTRUCTIONS = [
    'Deliver only between 08:00–10:00. Gate B.',
    'Call consignee 30 minutes before arrival.',
    'No forklift available on site.',
    'Security check required. Bring ID.',
    'Use loading dock 3. Ring bell twice.',
    'Delivery to warehouse, not office.',
    'Fragile items. Handle with care.',
    'Appointment required. Call +49 123 456789.'
];

const CARRIERS = ['DHL', 'SCH', 'DSV'];

function getCityInitials(country: string): string {
    const options = CITY_INITIALS_MAP[country] || CITY_INITIALS_MAP['DEFAULT'];
    return options[Math.floor(Math.random() * options.length)];
}

function getConsigneeName(country: string): string {
    // 15% Chance of Global Amazon regardless of country (unless already in list like MAD6/XOR4)
    if (Math.random() < 0.15) return 'Amazon Fulfillment';

    const options = CONSIGNEES_BY_COUNTRY[country] || CONSIGNEES_BY_COUNTRY['DEFAULT'];
    return options[Math.floor(Math.random() * options.length)];
}

function getDeliveryInstruction(): string | null {
    // 30% chance of having delivery instructions
    if (Math.random() < 0.3) {
        return DELIVERY_INSTRUCTIONS[Math.floor(Math.random() * DELIVERY_INSTRUCTIONS.length)];
    }
    return null;
}


async function main() {
    console.log('Seeding...')

    // Clean up
    await prisma.salesOrder.deleteMany()
    await prisma.salesOrderHistory.deleteMany() // Clean history too
    await prisma.tPAGroup.deleteMany()
    await prisma.truckGroup.deleteMany()
    await prisma.customer.deleteMany()
    await prisma.planningResult.deleteMany()

    await prisma.lane.deleteMany()
    await prisma.countryRule.deleteMany()
    await prisma.parcelRule.deleteMany()
    await prisma.directShipToRule.deleteMany()
    await prisma.thresholdRule.deleteMany()
    await prisma.carrier.deleteMany()

    // 1. Master Data

    // Lanes
    const lanes = [
        { name: 'DACH', countries: 'DE,AT,CH', lanePriority: 10 },
        { name: 'Benelux', countries: 'BE,NL,LU', lanePriority: 20 },
        { name: 'France', countries: 'FR', lanePriority: 30 },
        { name: 'Iberia', countries: 'ES,PT', lanePriority: 40 },
        { name: 'Nordics', countries: 'DK,SE,NO,FI', lanePriority: 50 },
        { name: 'South East', countries: 'CZ,SK,HU,RO', lanePriority: 60 },
        { name: 'UK/IE', countries: 'GB,IE', lanePriority: 70 },
        { name: 'Italy', countries: 'IT', lanePriority: 80 },
    ]

    for (const l of lanes) {
        await prisma.lane.create({
            data: {
                name: l.name,
                countries: l.countries,
                lanePriority: l.lanePriority
            }
        })
    }

    // Rules
    await prisma.thresholdRule.create({
        data: { id: '1', minVolumeDirect: 15.6, minVolumeFTL: 70.0, maxVolumeGroupage: 15.6 }
    })

    await prisma.parcelRule.create({
        data: { id: '1', country: 'DE', allowParcel: true, maxWeight: 30, maxVolumeM3: 0.5, note: 'Global Parcel Rule' }
    })

    // Carriers
    await prisma.carrier.createMany({
        data: [
            { code: 'DHL', name: 'DHL Freight' },
            { code: 'SCH', name: 'Schenker' },
            { code: 'DSV', name: 'DSV Road' }
        ]
    })

    // 2. Data Factory Helper
    const createOrder = async (
        ref: string,
        type: string, // 'parcel' | 'groupage' | 'direct' | 'ftl' | 'blocked'
        countryInput: string,
        shipDateInput: string, // YYYY-MM-DD
        statusOverride?: SalesOrderStatus,
        carrierOverride?: string
    ) => {
        // Destination Logic
        let dest;
        let forceFixed = Math.random() < 0.4;

        // Try to find a matching fixed destination
        const matchingFixed = FIXED_DESTINATIONS.filter(d => d.country === countryInput);

        if (forceFixed && matchingFixed.length > 0) {
            dest = matchingFixed[Math.floor(Math.random() * matchingFixed.length)];
        } else {
            // Random
            dest = {
                country: countryInput,
                zip: Math.floor(1000 + Math.random() * 9000).toString(),
                city: `City-${Math.floor(Math.random() * 100)}`,
                street: `Main St`,
                houseNo: `${Math.floor(Math.random() * 100)}`
            };
        }

        const shipToId = ShipToIdHelper.generateShipToId(dest.country, dest.zip, dest.city, dest.street, dest.houseNo);

        // Consolidation Flags
        const isNonConsolidation = Math.random() < 0.1; // 10% non-consolidation

        // Basic defaults
        let weight = 500
        let volume = 2.0
        let pcs = 50
        let incoterm = 'DAP'
        let forceDirect = false

        // Shipping Type Calc
        let shippingType: ShippingType = 'GROUPAGE';

        // Scenarios
        if (type === 'parcel') {
            weight = 10; volume = 0.1; pcs = 1; shippingType = 'PARCEL';
        }
        else if (type === 'direct') {
            weight = Math.floor(4000 + Math.random() * 6000);
            volume = 16.0 + (Math.random() * 10);
            forceDirect = true;
            shippingType = 'DIRECT_LTL';
        }
        else if (type === 'ftl') {
            weight = 22000;
            volume = 85.0;
            shippingType = 'DIRECT_FTL';
        }
        else if (type === 'groupage') {
            weight = Math.floor(100 + Math.random() * 2000);
            volume = 0.5 + (Math.random() * 4);
            shippingType = 'GROUPAGE';
        }

        if (type === 'blocked') {
            // keep country as is? no, user wants blocked
        }

        const start = new Date(shipDateInput)

        // Create Customer if not exists (mock)
        const custId = `CUST-${dest.country}`

        // Note: Customer model enforces unique [customerId, shipToId].
        // We reuse customer record if exists.
        let cust = await prisma.customer.findUnique({
            where: { customerId_shipToId: { customerId: custId, shipToId: shipToId } }
        });

        if (!cust) {
            cust = await prisma.customer.create({
                data: {
                    customerId: custId,
                    countryReference: dest.country,
                    shipToId: shipToId
                }
            })
        }

        // If Direct Type, ensure rule exists to enforce it if needed
        if (forceDirect) {
            const rule = await prisma.directShipToRule.findFirst({ where: { shipToId } })
            if (!rule) {
                await prisma.directShipToRule.create({
                    data: { country: dest.country, customerId: custId, shipToId, forceDirect: true }
                })
            }
        }

        // Metric Calculation
        const pallets = Math.ceil(volume / 1.2);
        const ldm = Number((pallets * 0.4).toFixed(1)); // Approx

        let finalStatus = statusOverride || 'OPEN';
        let finalCarrier = carrierOverride || undefined;
        let finalPickupDate = undefined;

        if (finalStatus === 'REQUESTED' || finalStatus === 'ACCEPTED' || finalStatus === 'REJECTED' || finalStatus === 'CONSOLIDATION_REQUESTED') {
            if (!finalCarrier) finalCarrier = CARRIERS[Math.floor(Math.random() * CARRIERS.length)]; // Assign random if needed
            finalPickupDate = start;
        }

        // Create Order
        const order = await prisma.salesOrder.create({
            data: {
                sapSalesOrderNumber: `SO-${ref}`,
                orderReferenceNumber: `PS${Math.floor(10000 + Math.random() * 90000)}`,
                requestedShippingDate: start,

                shipToAddress: shipToId,
                shipToName: `Customer ${dest.city}`,
                country: dest.country,
                zipCode: dest.zip,
                city: dest.city,

                // New fields
                shipToCountry: dest.country,
                shipToZip: dest.zip,
                shipToCity: dest.city,
                shipToStreet: dest.street,
                shipToHouseNo: dest.houseNo,

                isNonConsolidation: isNonConsolidation,
                consolidationAllowed: !isNonConsolidation,
                isShipToIdSimulated: true,

                weight: new Prisma.Decimal(weight),
                volumeM3: new Prisma.Decimal(volume),
                pallets: new Prisma.Decimal(pallets),
                loadingMeters: null,

                tpaNumber: null,
                tpaGroupId: null,
                effectiveShipmentType: null,

                cartonQuantity: pcs,
                height: new Prisma.Decimal(1.2),
                vasCode: '',
                incoterm,
                priorityLevel: 1,
                status: finalStatus,
                shippingType: shippingType,

                carrierName: finalCarrier,
                firstPickupDate: finalPickupDate,

                cityInitials: getCityInitials(dest.country),
                consignee: getConsigneeName(dest.country),
                deliveryInstruction: getDeliveryInstruction(),

                customerId: cust.id
            }
        });

        // Auto-Classify to apply Business Rules
        await ClassificationService.classifyOrder(order.id);
    }

    // 3. Generate Orders
    const baseDate = '2025-12-18';

    console.log('Generating Varied Dataset (~150 orders)...');

    // --- DIRECT ORDERS ---
    // 50 Direct LTL/FTL - OPEN (Baseline for Calculation)
    // We strictly seed OPEN orders. User must Calculate/Group in UI.
    console.log('Creating Direct Orders (OPEN)...');
    for (let i = 0; i < 30; i++) await createOrder(`DIR-OPEN-${i}`, 'direct', 'PL', baseDate, SalesOrderStatus.OPEN);
    for (let i = 0; i < 20; i++) await createOrder(`FTL-OPEN-${i}`, 'ftl', 'ES', baseDate, SalesOrderStatus.OPEN);

    // --- GROUPAGE ---
    console.log('Creating Groupage Orders (OPEN)...');
    for (let i = 0; i < 25; i++) await createOrder(`GRP-DE-${i}`, 'groupage', 'DE', baseDate, SalesOrderStatus.OPEN);
    for (let i = 0; i < 15; i++) await createOrder(`GRP-FR-${i}`, 'groupage', 'FR', baseDate, SalesOrderStatus.OPEN);
    for (let i = 0; i < 15; i++) await createOrder(`GRP-IT-${i}`, 'groupage', 'IT', baseDate, SalesOrderStatus.OPEN);
    for (let i = 0; i < 15; i++) await createOrder(`GRP-NL-${i}`, 'groupage', 'NL', baseDate, SalesOrderStatus.OPEN);


    // --- PARCEL ---
    for (let i = 0; i < 15; i++) await createOrder(`PAR-${i}`, 'parcel', 'DE', baseDate, SalesOrderStatus.OPEN);


    console.log('Seeding finished.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
