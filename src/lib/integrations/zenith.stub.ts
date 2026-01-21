import { EventLogService } from "@/services/event-log.service";
import { ZenithBookingRequest, ZenithBookingResponse } from "./types";

export class ZenithClient {
    static async requestBooking(entityId: string, type: 'TRUCK' | 'GROUP', details: any): Promise<ZenithBookingResponse> {
        await EventLogService.log('INTEGRATION', entityId, 'ZENITH_BOOKING_REQ', { type });

        const bookingRef = `BK-${entityId.substring(0, 5)}-${Date.now().toString().slice(-4)}`;

        const response: ZenithBookingResponse = {
            bookingRef,
            status: 'CONFIRMED'
        };

        await EventLogService.log('INTEGRATION', entityId, 'ZENITH_BOOKING_RESP', response);

        return response;
    }

    static async confirmBooking(bookingRef: string) {
        await EventLogService.log('INTEGRATION', 'SYSTEM', 'ZENITH_CONFIRM', { bookingRef });
        return true;
    }
}
