import { EventLogService } from "@/services/event-log.service";

export class OrtecClient {
    static async requestLoadDesign(truckId: string, payload: any) {
        // Stimulate call
        await new Promise(r => setTimeout(r, 200));

        await EventLogService.log('INTEGRATION', 'ORTEC', 'REQUEST_LOAD_DESIGN', {
            truckId,
            items: payload.length
        });

        // Mock response
        return {
            requestId: `REQ-ORTEC-${Date.now()}`,
            optimal: true,
            loadingMeters: 12.5 // Mock result
        }
    }
}

export class SapClient {
    static async sendPreAdvice(truckId: string) {
        await new Promise(r => setTimeout(r, 100));

        await EventLogService.log('INTEGRATION', 'SAP', 'SEND_PRE_ADVICE', { truckId });

        return {
            sapId: `SAP-DOC-${Date.now()}`
        }
    }
}
