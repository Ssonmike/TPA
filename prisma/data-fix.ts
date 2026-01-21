
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const orders = await prisma.salesOrder.findMany();
    const types = ['GROUPAGE', 'DIRECT_LTL', 'PARCEL', 'DIRECT_FTL'];

    for (const o of orders) {
        const randomType = types[Math.floor(Math.random() * types.length)];
        // Keep GROUPAGE somewhat dominant
        const type = Math.random() > 0.6 ? randomType : 'GROUPAGE';

        await prisma.salesOrder.update({
            where: { id: o.id },
            data: { shippingType: type as any }
        });
    }
    console.log('Randomized ' + orders.length + ' orders.');
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
