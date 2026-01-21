import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KPITileProps {
    title: string;
    count: number;
    volume: number;
    pallets: number;
    className?: string;
    active?: boolean;
}

export function KPITile({ title, count, volume, pallets, className, active }: KPITileProps) {
    return (
        <Card className={cn("border-l-4 shadow-sm hover:shadow-md transition-shadow",
            active ? "border-l-blue-600 bg-blue-50/20" : "border-l-gray-200",
            className
        )}>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-gray-900">{count}</div>
                <div className="text-xs text-gray-500 mt-1 flex gap-2">
                    <span>{pallets} PAL</span>
                    <span>•</span>
                    <span>{volume.toFixed(1)} m³</span>
                </div>
            </CardContent>
        </Card>
    );
}
