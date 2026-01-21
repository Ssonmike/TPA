
import { PrismaClient } from "@prisma/client";
import { ClassificationService } from "./src/services/classification.service";

const prisma = new PrismaClient();

async function main() {
    console.log("Starting Re-Classification of Orders...");

    const orders = await prisma.salesOrder.findMany({
        where: {
            // Re-classify EVERYTHING to ensure demo status is correct
            // Or limit to OPEN/PLANNED? Let's do all active orders (not archived/deleted if any)
        }
    });

    console.log(`Found ${orders.length} orders to process.`);

    let countAPT = 0;
    let countAVIS = 0;
    let countSTD = 0;

    for (const order of orders) {
        // We can reuse the logic by calling Classify? Or just the booking logic?
        // ClassificationService.classifyOrder does a lot (Country, Status).
        // Let's copy the logic here or make a helper. 
        // Ideally, we just update the specific fields to avoid resetting Status unexpectedly.

        let bookingType = "STD";
        let bookingManager = "CARRIER";

        const consigneeHigh = (order.consignee || "").toUpperCase();
        const weight = Number(order.weight);

        // --- RULES ---
        if (consigneeHigh.includes("AMAZON") || consigneeHigh.includes("BOL.COM")) {
            bookingType = "APT";
            bookingManager = "CARRIER";
            countAPT++;
        } else if (consigneeHigh.includes("TECHDATA")) {
            bookingType = "APT";
            bookingManager = "CT";
            countAPT++;
        } else if (consigneeHigh.includes("LOGISTICS CORP") || weight > 10000) {
            bookingType = "AVIS";
            countAVIS++;
        } else {
            bookingType = "STD";
            countSTD++;
        }

        await prisma.salesOrder.update({
            where: { id: order.id },
            data: {
                bookingType,
                bookingManager
            }
        });

        process.stdout.write(".");
    }

    console.log("\nDone!");
    console.log(`Result: APT=${countAPT}, AVIS=${countAVIS}, STD=${countSTD}`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
