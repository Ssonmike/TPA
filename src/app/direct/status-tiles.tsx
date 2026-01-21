import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { DirectOrderRow } from "./columns";

interface StatusTilesProps {
    orders: DirectOrderRow[];
}

export function StatusTiles({ orders }: StatusTilesProps) {
    // Calculate metrics
    const metrics = orders.reduce((acc, order) => {
        let status = order.status || 'OPEN';

        // VISUAL MAPPING: CALCULATED -> OPEN
        if (status === 'CALCULATED') {
            status = 'OPEN';
        }

        if (!acc[status]) acc[status] = { count: 0, pallets: 0 };
        acc[status].count++;
        acc[status].pallets += (order.pallets || 0);

        return acc;
    }, {} as Record<string, { count: number, pallets: number }>);

    // Map to specific tiles requested - New Lifecycle
    const tiles = [
        // OPEN (Includes calculated)
        { title: "Open", status: "OPEN", color: "border-l-amber-500" },
        // REQUESTED (Sent to carrier)
        { title: "Requested", status: "REQUESTED", color: "border-l-blue-400" },
        // ACCEPTED (By carrier)
        { title: "Accepted", status: "ACCEPTED", color: "border-l-blue-600" },
        // REJECTED (By carrier)
        { title: "Rejected", status: "REJECTED", color: "border-l-red-500" },
        // PLANNED (Manually executed)
        { title: "Planned", status: "PLANNED", color: "border-l-emerald-500" },
        // CLOSED
        { title: "Closed", status: "CLOSED", color: "border-l-gray-500" },
    ];

    return (
        <div className="grid grid-cols-6 gap-4">
            {tiles.map((tile) => {
                const data = metrics[tile.status] || { count: 0, pallets: 0 };
                return (
                    <Card key={tile.title} className={cn("border-l-4 shadow-sm", tile.color)}>
                        <CardHeader className="p-3 pb-1">
                            <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                {tile.title}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                            <div className="text-xl font-bold text-gray-900">{data.count}</div>
                            <div className="text-[10px] text-gray-500 mt-0">
                                {data.pallets} Pallets
                            </div>
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    )
}
