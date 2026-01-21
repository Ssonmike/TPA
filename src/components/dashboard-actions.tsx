"use client"

import { Button } from "@/components/ui/button";
import { Calculator, Play, Loader2, Layers, Package, Truck } from "lucide-react";
import { calculateAllOpenOrdersAction } from "@/app/actions";
import { groupOrdersAction } from "@/app/tpa-groups/actions";
import { useState } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function DashboardActions() {
    const [loading, setLoading] = useState(false);

    const handleCalculate = async () => {
        setLoading(true);
        try {
            await calculateAllOpenOrdersAction();
        } finally {
            setLoading(false);
        }
    };

    const handleGroup = async () => {
        setLoading(true);
        try {
            await groupOrdersAction();
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handleCalculate} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calculator className="mr-2 h-4 w-4" />}
                Calculate
            </Button>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button size="sm" disabled={loading}>
                        <Play className="mr-2 h-4 w-4" />
                        Plan Actions
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={handleGroup} disabled={loading}>
                        <Layers className="mr-2 h-4 w-4" />
                        Group Orders
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={async () => {
                        setLoading(true);
                        const { planParcelAction } = await import("@/app/planning/actions");
                        await planParcelAction();
                        setLoading(false);
                    }} disabled={loading}>
                        <Package className="mr-2 h-4 w-4" />
                        Plan Parcel
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={async () => {
                        setLoading(true);
                        const { planDirectAction } = await import("@/app/planning/actions");
                        await planDirectAction();
                        setLoading(false);
                    }} disabled={loading}>
                        <Truck className="mr-2 h-4 w-4" />
                        Plan Direct
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled>
                        Plan Trucks (Not Implemented)
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
