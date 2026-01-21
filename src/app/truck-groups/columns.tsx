"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RotateCcw } from "lucide-react"

export type TruckRow = {
    id: string;
    truckNumber: string | null;
    status: string;
    shipDate: Date | null;
    truckTotalLDM: number;
    truckTotalWeight: number;
    truckTotalPallets: number;
    ordersCount: number;
    laneId: string | null;
}

const UnplanTruckButton = ({ truckId }: { truckId: string }) => {
    return (
        <form>
            <Button
                variant="ghost"
                size="sm"
                className="text-orange-500 hover:text-orange-700 h-6 px-2"
                formAction={async () => {
                    const { unplanTruckAction } = await import("@/app/planning/actions");
                    await unplanTruckAction(truckId);
                }}
            >
                <RotateCcw className="h-4 w-4 mr-1" />
                Unplan
            </Button>
        </form>
    )
}

import Link from "next/link";
// ... imports

export const truckColumns: ColumnDef<TruckRow>[] = [
    {
        accessorKey: "truckNumber",
        header: "Truck No",
        cell: ({ row }) => {
            const id = row.original.id;
            const val = row.getValue("truckNumber") || "N/A";
            return (
                <Link href={`/truck-groups/${id}`} className="font-mono font-bold text-blue-600 hover:underline">
                    {val as string}
                </Link>
            )
        }
    },
    // ...
    {
        accessorKey: "truckTotalLDM",
        header: "LDM",
        cell: ({ row }) => {
            const val = Number(row.getValue("truckTotalLDM"));
            const max = (row.original as any).maxLdm || 13.6; // Ensure passed in data
            const isFull = val >= (max - 0.6); // Visual threshold
            return (
                <div className={`text-right font-bold ${isFull ? 'text-green-600' : ''}`}>
                    {val.toFixed(1)} <span className="text-muted-foreground text-xs font-normal">/ {max}</span>
                </div>
            )
        }
    },
    {
        accessorKey: "truckTotalPallets",
        header: "Pallets",
        cell: ({ row }) => <div className="text-right">{row.getValue("truckTotalPallets")}</div>
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const status = row.getValue("status") as string;
            if (status !== "PLANNED") return null;

            return (
                <div className="flex justify-end">
                    <UnplanTruckButton truckId={row.original.id} />
                </div>
            )
        }
    }
]
