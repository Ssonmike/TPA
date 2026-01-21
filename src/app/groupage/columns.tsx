"use client"

import { ColumnDef } from "@tanstack/react-table"
import { SalesOrderRow } from "@/types"; // Make sure to use the safe type
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";

// We can reuse the SalesOrderRow type if we cast properly, or define a specific one.
// For now, let's assume the rows passed are compatible.

export const groupageColumns: ColumnDef<any>[] = [
    {
        accessorKey: "priorityLevel",
        header: "Prio",
        cell: ({ row }) => {
            const prio = row.getValue("priorityLevel") as number;
            return prio > 1 ? <AlertCircle className="h-4 w-4 text-red-500" /> : null;
        },
    },
    {
        accessorKey: "zipCode",
        header: "Zip",
    },
    {
        accessorKey: "country",
        header: "Ctry",
        cell: ({ row }) => <span className="font-bold">{row.getValue("country")}</span>
    },
    {
        accessorKey: "city",
        header: "City",
    },
    {
        accessorKey: "orderReferenceNumber",
        header: "Ref",
    },
    {
        accessorKey: "cartonQuantity",
        header: "PCS",
        cell: ({ row }) => <div className="text-right">{row.getValue("cartonQuantity")}</div>
    },
    {
        accessorKey: "pallets",
        header: "PAL",
        cell: ({ row }) => <div className="text-right">{row.getValue("pallets")}</div>
    },
    {
        accessorKey: "loadingMeters", // Mapped to _ldm or loadingMeters in service? Service returns renamed objects.
        // Actually findingMany returns prisma objects, we need to be careful with the mapping in service.
        // Let's assume we pass the raw 'loadingMeters' decimal which the table might struggle with if not mapped.
        // We should ensure the service returns numbers.
        header: "LDM",
        cell: ({ row }) => {
            // We will make sure data coming in has number
            const val = row.original.loadingMeters !== null ? Number(row.original.loadingMeters) : 0;
            return <div className="text-right">{val.toFixed(2)}</div>
        }
    },
    {
        accessorKey: "deliveryInstructions",
        header: "Instructions",
        cell: ({ row }) => <span className="text-xs italic text-muted-foreground">{row.getValue("deliveryInstructions")}</span>
    },
]
