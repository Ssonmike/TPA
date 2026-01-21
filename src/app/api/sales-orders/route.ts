import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ClassificationService } from '@/lib/services/classification.service';
import { ValidationService } from '@/lib/services/validation.service';
import { GroupingService } from '@/lib/services/grouping.service';
import { CONFIG } from '@/lib/config';
import { SalesOrderStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    // Add other filters as needed

    const where: any = {};
    if (status && status !== 'All') {
        where.status = status;
    }

    const orders = await prisma.salesOrder.findMany({
        where,
        include: { tpaGroup: true },
        orderBy: { requestedShippingDate: 'asc' },
        take: 100 // pagination usually needed
    });

    return NextResponse.json(orders);
}

export async function POST(req: NextRequest) {
    // Manual creation or update
    const body = await req.json();
    const so = await prisma.salesOrder.create({ data: body });

    // Trigger Classification immediately?
    // Usually Import job does this. 

    return NextResponse.json(so);
}
