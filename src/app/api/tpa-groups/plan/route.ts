import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { TPAGroupStatus, SalesOrderStatus } from '@prisma/client';

export async function POST(req: NextRequest) {
    const { tpaGroupId } = await req.json();

    if (!tpaGroupId) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    // 1. Update Group Status
    const group = await prisma.tpaGroup.update({
        where: { id: tpaGroupId },
        data: {
            status: TPAGroupStatus.PLANNED,
            plannedDate: new Date()
        },
        include: { salesOrders: true }
    });

    // 2. Update SO Status
    await prisma.salesOrder.updateMany({
        where: { tpaGroupId: tpaGroupId },
        data: { status: SalesOrderStatus.PLANNED }
    });

    return NextResponse.json({ success: true, group });
}
