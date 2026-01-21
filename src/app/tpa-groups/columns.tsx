"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"

// Simple type mapping from Prisma result
export type GroupRow = {
    id: string;
    groupNo: string | null;
    status: string;
    shippingType: string;
    shipDate: Date | null;
    ordersCount: number;
    totalLDM: number;
    totalWeight: number;
    totalPallets: number;
    laneId: string | null;
}

// Mini component for the action (Defined BEFORE usage in columns)
const CancelGroupButton = ({ groupId }: { groupId: string }) => {
    return (
        <Button
            variant="ghost"
            size="sm"
            className="text-red-500 hover:text-red-700 h-6 px-2"
            formAction={async () => {
                const { cancelGroupAction } = await import("@/app/planning/actions");
                await cancelGroupAction(groupId);
            }}
        >
            <Trash2 className="h-4 w-4" />
        </Button>
    )
}

export const groupColumns: ColumnDef<GroupRow>[] = [
    {
        accessorKey: "groupNo",
        header: "Group No",
        cell: ({ row }) => <span className="font-mono font-bold">{row.getValue("groupNo") || "N/A"}</span>
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
            const val = row.getValue("status") as string;
            // Map colors
            return <Badge variant="secondary">{val}</Badge>
        }
    },
    {
        accessorKey: "shipDate",
        header: "Ship Date",
        cell: ({ row }) => {
            const raw = row.getValue("shipDate");
            if (!raw) return '-';
            const d = new Date(raw as string | Date);
            return isNaN(d.getTime()) ? '-' : d.toLocaleDateString();
        }
    },
    {
        accessorKey: "shippingType",
        header: "Type",
    },
    {
        accessorKey: "ordersCount",
        header: "Orders",
        cell: ({ row }) => <div className="text-right">{row.getValue("ordersCount")}</div>
    },
    {
        accessorKey: "totalLDM",
        header: "LDM",
        cell: ({ row }) => <div className="text-right font-bold">{Number(row.getValue("totalLDM")).toFixed(1)}</div>
    },
    {
        accessorKey: "totalPallets",
        header: "Pallets",
        cell: ({ row }) => <div className="text-right">{row.getValue("totalPallets")}</div>
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const status = row.getValue("status") as string;
            // Action safe?
            if (status === "PLANNED" || status === "CANCELLED") return null;

            return (
                <div className="flex justify-end">
                    <form>
                        {/* We need a proper component to call action */}
                        <CancelGroupButton groupId={row.original.id} />
                    </form>
                </div>
            )
        }
    }
]
