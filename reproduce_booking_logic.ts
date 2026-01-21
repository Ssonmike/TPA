
import { PrismaClient, SalesOrderStatus, ShippingType } from '@prisma/client';
import { ClassificationService } from './src/services/classification.service';

const prisma = new PrismaClient();

async function main() {
    console.log("Starting Booking Logic Verification...");

    // Clean up test data if exists
    try {
        await prisma.salesOrder.deleteMany({
            where: { sapSalesOrderNumber: { startsWith: 'TEST-BOOK-' } }
        });
    } catch (e) { }

    // 0. Ensure Dependencies
    const customer = await prisma.customer.upsert({
        where: { customerId_shipToId: { customerId: 'TEST-CUST', shipToId: 'TEST-SHIP' } },
        update: {},
        create: {
            customerId: 'TEST-CUST',
            shipToId: 'TEST-SHIP',
            countryReference: 'DE',
            // other required fields
        }
    });

    // 1. Create Order for Amazon (Should be APT / CARRIER)
    const orderAmazon = await prisma.salesOrder.create({
        data: {
            sapSalesOrderNumber: 'TEST-BOOK-AMAZON',
            orderReferenceNumber: 'REF-AMZ',
            requestedShippingDate: new Date(),
            weight: 100,
            volumeM3: 1,
            cartonQuantity: 10,
            height: 1.0,
            shipToAddress: 'DE-12345',
            country: 'DE',
            zipCode: '12345',
            city: 'Berlin',
            incoterm: 'DAP',
            consignee: 'Amazon EU SARL', // Trigger
            shippingType: ShippingType.GROUPAGE,
            customerId: customer.id, // Use valid ID
        }
    });

    // 2. Create Order for Priority (Should be AVIS)
    const orderPrio = await prisma.salesOrder.create({
        data: {
            sapSalesOrderNumber: 'TEST-BOOK-PRIO',
            orderReferenceNumber: 'REF-PRIO',
            requestedShippingDate: new Date(),
            weight: 100,
            volumeM3: 1,
            cartonQuantity: 10,
            height: 1.0,
            shipToAddress: 'DE-67890',
            country: 'DE',
            zipCode: '67890',
            city: 'Munich',
            incoterm: 'DAP',
            priorityLevel: 2, // Trigger
            shippingType: ShippingType.GROUPAGE,
            customerId: orderAmazon.customerId,
        }
    });

    // 3. Create Standard Order (Should be STD)
    const orderStd = await prisma.salesOrder.create({
        data: {
            sapSalesOrderNumber: 'TEST-BOOK-STD',
            orderReferenceNumber: 'REF-STD',
            requestedShippingDate: new Date(),
            weight: 100,
            volumeM3: 1,
            cartonQuantity: 10,
            height: 1.0,
            shipToAddress: 'DE-11111',
            country: 'DE',
            zipCode: '11111',
            city: 'Hamburg',
            incoterm: 'DAP',
            shippingType: ShippingType.GROUPAGE,
            customerId: orderAmazon.customerId,
        }
    });

    // 4. Create Order for Control Tower (Should be APT / CT -> BOOKING_REQUESTED)
    const orderCT = await prisma.salesOrder.create({
        data: {
            sapSalesOrderNumber: 'TEST-BOOK-CT',
            orderReferenceNumber: 'REF-CT',
            requestedShippingDate: new Date(),
            weight: 100,
            volumeM3: 1,
            cartonQuantity: 10,
            height: 1.0,
            shipToAddress: 'DE-99999',
            country: 'DE',
            zipCode: '99999',
            city: 'Stuttgart',
            incoterm: 'DAP',
            consignee: 'SOME BIG CUSTOMER',
            shippingType: ShippingType.GROUPAGE,
            customerId: customer.id,
            // Manual overrides to simulate CT case
            bookingType: 'APT',
            bookingManager: 'CT'
        }
    });

    console.log("Orders Created. Running Classification...");

    // Run Classification
    await ClassificationService.classifyOrder(orderAmazon.id);
    await ClassificationService.classifyOrder(orderPrio.id);
    await ClassificationService.classifyOrder(orderStd.id);
    await ClassificationService.classifyOrder(orderCT.id); // Should trigger status change

    console.log("Classification Done. Verifying Results...");

    const checkAmazon = await prisma.salesOrder.findUnique({ where: { id: orderAmazon.id } });
    const checkPrio = await prisma.salesOrder.findUnique({ where: { id: orderPrio.id } });
    const checkStd = await prisma.salesOrder.findUnique({ where: { id: orderStd.id } });
    const checkCT = await prisma.salesOrder.findUnique({ where: { id: orderCT.id } });

    console.log(`Amazon: ${checkAmazon?.bookingType} / ${checkAmazon?.bookingManager} (Expected: APT / CARRIER)`);
    console.log(`Prio:   ${checkPrio?.bookingType}   (Expected: AVIS)`);
    console.log(`Std:    ${checkStd?.bookingType}    (Expected: STD)`);
    console.log(`CT:     ${checkCT?.status}          (Expected: BOOKING_REQUESTED)`);

    if (
        checkAmazon?.bookingType === 'APT' && checkAmazon?.bookingManager === 'CARRIER' &&
        checkPrio?.bookingType === 'AVIS' &&
        checkStd?.bookingType === 'STD' &&
        checkCT?.status === 'BOOKING_REQUESTED'
    ) {
        console.log("SUCCESS: All logic Verified.");
    } else {
        console.error("FAILURE: Logic mismatch.");
        process.exit(1);
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
