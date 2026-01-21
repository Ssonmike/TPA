export interface OrtecLoadDesignRequest {
    truckId: string;
    groups: any[]; // Or specific type
}

export interface OrtecLoadDesignResponse {
    ortecRef: string;
    pallets: number;
    ldm: number;
    requestId: string;
}

export interface ZenithBookingRequest {
    entityId: string;
    entityType: 'TRUCK' | 'ORDER' | 'GROUP';
    details: any;
}

export interface ZenithBookingResponse {
    bookingRef: string;
    status: 'CONFIRMED' | 'PENDING';
}

export interface SapDeliveryRequest {
    orderId: string;
    // ...
}

export interface SapDeliveryResponse {
    sapDeliveryId: string;
    status: 'CREATED';
}
