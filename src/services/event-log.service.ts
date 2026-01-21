import { PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/db';

export class EventLogService {
    static async log(
        entityType: string,
        entityId: string,
        eventType: string,
        payload: any,
        actor: string = 'SYSTEM'
    ) {
        return await prisma.eventLog.create({
            data: {
                entityType,
                entityId,
                eventType,
                payload: payload ? JSON.parse(JSON.stringify(payload)) : undefined, // Ensure serializable
                actor
            }
        });
    }
}
