import { EventLogService } from "@/services/event-log.service";

export class SapClient {
    static async createDelivery(orderId: string, items: any[]) {
        await EventLogService.log('INTEGRATION', orderId, 'SAP_CREATE_DELIVERY', { items: items.length });
        return { sapDeliveryId: `DEL-${Math.floor(Math.random() * 10000)}`, status: 'CREATED' };
    }

    static async sendPreAdvice(truckId: string, truckData: any) {
        await EventLogService.log('INTEGRATION', truckId, 'SAP_PRE_ADVICE', { truckNo: truckData.truckNumber });
        return { success: true };
    }

    static async sendRouteAdvice(truckId: string, routeData: any) {
        await EventLogService.log('INTEGRATION', truckId, 'SAP_ROUTE_ADVICE', { route: routeData });
        return { success: true };
    }
}
