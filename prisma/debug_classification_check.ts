
import { PrismaClient } from '@prisma/client';
import { ClassificationService } from '@/services/classification.service';

const prisma = new PrismaClient();

async function main() {
    console.log("--- Debugging Classification ---");

    // 1. Find a "broken" order: Volume > 16 but Groupage
    const order = await prisma.salesOrder.findFirst({
        where: {
            volumeM3: { gt: 16 },
            shippingType: 'GROUPAGE'
        }
    });

    if (!order) {
        console.log("No misclassified orders found (Vol > 16 && Groupage).");
        // Check if we have ANY order > 16 just to see what they are
        const anyBig = await prisma.salesOrder.findFirst({ where: { volumeM3: { gt: 16 } } });
        if (anyBig) console.log("Found big order:", anyBig.id, anyBig.shippingType, anyBig.volumeM3);
        return;
    }

    console.log(`Found Misclassified Order: ${order.id}`);
    console.log(`  Volume: ${order.volumeM3}`);
    console.log(`  Current Type: ${order.shippingType}`);
    console.log(`  Country: ${order.country}`);
    console.log(`  Status: ${order.status}`);

    // 2. Check Rules
    const thresholds = await prisma.thresholdRule.findFirst({ where: { id: '1' } });
    console.log("Threshold Rules found:", thresholds);

    // 3. Run Classification Forcefully
    console.log("Running classifyOrder()...");
    try {
        const updated = await ClassificationService.classifyOrder(order.id);
        console.log("Resulting Type:", updated.shippingType);

        if (updated.shippingType === 'GROUPAGE') {
            console.error("FAIL: Still classified as GROUPAGE despite High Volume!");
        } else {
            console.log("SUCCESS: Re-classified to", updated.shippingType);
        }
    } catch (e) {
        console.error(e);
    }
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
