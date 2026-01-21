import { EventLogService } from "@/services/event-log.service";
import { OrtecLoadDesignRequest, OrtecLoadDesignResponse } from "./types";

export class OrtecClient {
    static async requestLoadDesign(truckId: string, groups: any[]): Promise<OrtecLoadDesignResponse> {
        // Deterministic Stub
        // Simulate calc based on simple math
        const totalLdm = groups.reduce((acc, g) => acc + Number(g.totalLDM || 0), 0);
        const totalPallets = groups.reduce((acc, g) => acc + Number(g.totalPallets || 0), 0);

        const requestId = `ORT-${Date.now()}`;

        await EventLogService.log('INTEGRATION', truckId, 'ORTEC_REQUEST', { groupsCount: groups.length });

        // Simulate delay
        await new Promise(r => setTimeout(r, 500));

        const response: OrtecLoadDesignResponse = {
            ortecRef: `ORTEC-PLAN-${truckId.substring(0, 4)}`,
            pallets: totalPallets, // Echo back
            ldm: totalLdm, // Echo back
            requestId
        };

        await EventLogService.log('INTEGRATION', truckId, 'ORTEC_RESPONSE', response);

        return response;
    }
}
