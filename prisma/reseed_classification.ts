
import { PrismaClient, ShippingType } from '@prisma/client';
import { ClassificationService } from '@/services/classification.service'; // We need relative alias to work in tsx? Or strict path?
// Usually tsx handles @ paths if tsconfig is setup. If not, we might need relative:
// import { ClassificationService } from '../src/services/classification.service'; 
// Let's try to simulate the logic inline if imports fail, OR assume standard 'src' is mapped in tsconfig.
// Attempting relative import for safety in script context usually safer if not sure about paths.
import { ClassificationService } from '../src/services/classification.service';

const prisma = new PrismaClient();

async function main() {
    console.log("Fetching orders...");
    const orders = await prisma.salesOrder.findMany();

    console.log(`Processing ${orders.length} orders...`);

    const properties = [
        // Parcel: Low Volume, Low Weight
        { label: 'PARCEL', range: { w: [1, 10], v: [0.01, 0.1] } },
        // Groupage: < 15.6 m3
        { label: 'GROUPAGE', range: { w: [100, 5000], v: [1, 15.0] } },
        // Direct LTL: >= 15.6 m3 AND < 70.72 m3
        { label: 'DIRECT_LTL', range: { w: [6000, 15000], v: [15.6, 60] } },
        // Direct FTL: >= 70.72 m3
        { label: 'DIRECT_FTL', range: { w: [20000, 24000], v: [70.72, 90] } },
        // Blocked: Random mix (often invalid data like country XX)
        { label: 'BLOCKED_DIM', range: { w: [100, 500], v: [2, 5], h: 400 } }
    ];

    // 4. Update and Classify
    for (const o of orders) {
        // Pick a scenario with weighted probability to ensure variety
        const randVal = Math.random();
        let scenario;
        if (randVal < 0.15) scenario = properties[0]; // 15% Parcel
        else if (randVal < 0.60) scenario = properties[1]; // 45% Groupage
        else if (randVal < 0.85) scenario = properties[2]; // 25% Direct LTL
        else if (randVal < 0.95) scenario = properties[3]; // 10% Direct FTL
        else scenario = properties[4]; // 5% Blocked

        const w = rand(scenario.range.w);
        const v = rand(scenario.range.v);
        const h = scenario.range.h || 100;

        let country = o.country;
        // Inject faulty country for Blocked scenario
        if (scenario.label === 'BLOCKED_DIM') country = 'XX';
        // Ensure valid European countries for the rest to avoid accidental blocking
        if (country === 'XX' && scenario.label !== 'BLOCKED_DIM') country = 'DE';

        await prisma.salesOrder.update({
            where: { id: o.id },
            data: {
                weight: w,
                volumeM3: v,
                height: h,
                country: country,
                // Reset fields
                loadingMeters: null,
                pallets: null,
                status: 'OPEN',
                shippingType: 'GROUPAGE' // Reset to default, let ClassificationService fix it
            }
        });

        // Run Logic
        try {
            await ClassificationService.classifyOrder(o.id);
        } catch (e) {
            console.error(`Failed to classify ${o.id}`, e);
        }
    }

    console.log("Done. All orders have been randomized and strictly classified.");
}

function rand([min, max]: number[]) {
    return Math.random() * (max - min) + min;
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
