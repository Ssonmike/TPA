"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { ArrowUpDown, Minus, Plus, AlertCircle, ArrowRight, Star, History as HistoryIcon } from "lucide-react"
import { cn } from "@/lib/utils"
// New Components
import { AppointmentDateCell } from "./cba-date-cell"
import { DocsCell } from "./cba-docs-cell"



export interface CBAOrder {
    id: string
    orderReferenceNumber: string
    carrierName?: string
    firstPickupDate?: Date
    status: string
    // Booking
    bookingType?: string
    bookingManager?: string

    // Appointment (New)
    actualPickupDate?: Date
    pickUpTime?: string
    confirmedDeliveryDate?: Date
    confirmedDeliveryTime?: string

    shipToCity: string
    shipToCountry: string
    weight: number
    volumeM3: number
    loadingMeters: number | null
    tpaNumber?: string
    consignee?: string
    pallets: number
    cartonQuantity: number
}




function SortHeader({ column, title }: { column: any, title: string }) {
    return (
        <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-6 text-xs font-bold w-fit hover:bg-transparent"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
            {title}
            <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
    )
}

// Add Meta Interface
import { RowData } from "@tanstack/react-table"

declare module '@tanstack/react-table' {
    interface TableMeta<TData extends RowData> {
        onViewHistory: (orderIds: string[], tpaNumber?: string) => void
    }
}

export const cbaColumns: ColumnDef<CBAOrder>[] = [
    // ... existing columns

    {
        id: "select",
        header: ({ table }) => (
            <Checkbox
                checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
                onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                aria-label="Select all"
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="Select row"
            />
        ),
        enableSorting: false,
        enableHiding: false,
    },
    {
        accessorKey: "tpaNumber",
        header: ({ column }) => <SortHeader column={column} title="TPA #" />,
        cell: ({ row }) => {
            const val = row.getValue("tpaNumber") as string;
            // @ts-ignore
            if (!row.original.isGroupHeader) return <div className="text-gray-300 ml-6">-</div>;

            return (
                <div className="flex items-center gap-1">
                    {row.getCanExpand() ? (
                        <button
                            onClick={row.getToggleExpandedHandler()}
                            className="h-5 w-5 flex items-center justify-center bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-sm cursor-pointer transition-colors"
                        >
                            {row.getIsExpanded() ? <Minus className="h-3 w-3 font-bold" /> : <Plus className="h-3 w-3 font-bold" />}
                        </button>
                    ) : <span className="w-5"></span>}

                    <div className="text-xs text-blue-600 font-mono font-bold">
                        {val || "-"}
                    </div>
                </div>
            )
        }
    },
    {
        accessorKey: "orderReferenceNumber",
        header: ({ column }) => <SortHeader column={column} title="Ref" />,
        cell: ({ row }) => {
            // @ts-ignore
            if (row.original.isGroupHeader) return null;
            return (
                <div className="flex flex-col">
                    <span className="font-bold text-xs">{row.getValue("orderReferenceNumber")}</span>
                    {/* Cust Ref placeholder if data existed */}
                </div>
            )
        }
    },
    {
        accessorKey: "consignee",
        header: "Name (Consignee)",
        cell: ({ row }) => {
            const val = row.getValue("consignee") as string;
            const isAmazon = val?.toUpperCase().includes("AMAZON");
            return (
                <div className="flex items-center gap-1">
                    {isAmazon && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                    <div className={cn("text-xs truncate max-w-[150px]", isAmazon && "font-bold text-blue-700")}>
                        {val || "-"}
                    </div>
                </div>
            )
        }
    },
    {
        accessorKey: "shipToCountry",
        header: "Dest",
        cell: ({ row }) => (
            <div className="flex items-center gap-1 text-xs">
                <span className="font-bold">{row.getValue("shipToCountry")}</span>
                <span className="text-gray-500">{row.original.shipToCity}</span>
            </div>
        )
    },
    {
        accessorKey: "cartonQuantity",
        header: ({ column }) => <SortHeader column={column} title="PCS" />,
        cell: ({ row }) => <div className="text-xs text-right">{row.getValue("cartonQuantity")}</div>
    },
    {
        accessorKey: "pallets",
        header: ({ column }) => <SortHeader column={column} title="PAL" />,
        cell: ({ row }) => <div className="text-xs text-right">{row.getValue("pallets")}</div>
    },
    {
        accessorKey: "weight",
        header: ({ column }) => <SortHeader column={column} title="Wgt (KG)" />,
        cell: ({ row }) => <div className="text-xs text-right">{Number(row.getValue("weight")).toFixed(0)}</div>
    },

    // NEW: Workflow (Booking Type)
    {
        accessorKey: "bookingType", // Accessor matching the data field
        header: ({ column }) => <SortHeader column={column} title="Workflow" />,
        cell: ({ row }) => {
            // Strict read: data should be passed from page.tsx (Prisma)
            const type = row.original.bookingType || "STD";
            const mgr = row.original.bookingManager;

            // Badge Logic
            let badgeClass = "text-[10px] px-1 py-0 h-5 font-bold border ";
            if (type === 'APT') badgeClass += "bg-orange-100 text-orange-800 border-orange-200";
            else if (type === 'AVIS') badgeClass += "bg-blue-100 text-blue-800 border-blue-200";
            else if (type === 'MIX') badgeClass += "bg-slate-100 text-slate-800 border-slate-200";
            else badgeClass += "bg-gray-100 text-gray-500 border-gray-200 font-normal"; // STD

            return (
                <div className="flex flex-col items-start gap-0.5">
                    <Badge variant="outline" className={badgeClass}>
                        {type}
                    </Badge>
                    {/* Manager Indicator */}
                    {(type === 'APT') && (
                        <span className={cn("text-[9px] font-mono leading-none", mgr === 'CT' ? "text-purple-600 font-bold" : "text-gray-400")}>
                            {mgr === 'CT' ? 'CT' : 'CA'}
                        </span>
                    )}
                </div>
            )
        }
    },
    // NEW: Manager
    {
        accessorKey: "bookingManager",
        header: ({ column }) => <SortHeader column={column} title="Mngr" />,
        cell: ({ row }) => {
            const mgr = row.original.bookingManager; // CARRIER or CT
            const type = row.original.bookingType;

            if (type !== 'APT') return <span className="text-gray-300 text-[10px]">-</span>;

            return (
                <div className={cn("text-[10px] font-mono font-bold", mgr === 'CT' ? "text-purple-600" : "text-slate-600")}>
                    {mgr || "CARR"}
                </div>
            )
        }
    },

    // Earliest P.U. (Req. Pick Up) - Read Only
    {
        accessorKey: "firstPickupDate",
        header: "Earliest P.U.",
        cell: ({ row }) => {
            const val = row.getValue("firstPickupDate");
            if (!val) return <span className="text-gray-300">-</span>;
            const date = new Date(val as Date);

            return (
                <div className={cn("flex items-center gap-1.5")}>
                    <div className="text-xs whitespace-nowrap text-gray-500">{date.toLocaleDateString("es-ES")}</div>
                </div>
            )
        }
    },

    // Delivery Date (Confirmed Delivery) - Read Only
    {
        accessorKey: "confirmedDeliveryDate",
        header: "Delivery Date",
        cell: ({ row }) => {
            const status = row.original.status;
            // Force blank if initial status
            if (status === 'REQUESTED' || status === 'BOOKING_REQUESTED') return <div className="text-gray-300 text-xs">-</div>;

            const date = row.original.confirmedDeliveryDate;
            const time = row.original.confirmedDeliveryTime;

            if (!date) return <div className="text-gray-300 text-xs">-</div>;

            return (
                <div className="flex flex-col text-xs">
                    <span className="font-medium text-gray-900">{typeof date === 'string' ? new Date(date).toLocaleDateString("es-ES") : date.toLocaleDateString("es-ES")}</span>
                    {time && <span className="text-gray-500 text-[10px]">{time}</span>}
                </div>
            );
        }
    },

    // Final P.U. (Actual Pick Up) - Read Only
    {
        accessorKey: "actualPickupDate",
        header: "Final P.U.",
        cell: ({ row }) => {
            const status = row.original.status;
            // Force blank if initial status
            if (status === 'REQUESTED' || status === 'BOOKING_REQUESTED') return <div className="text-gray-300 text-xs">-</div>;

            const date = row.original.actualPickupDate;
            const time = row.original.pickUpTime;

            if (!date) return <div className="text-gray-300 text-xs">-</div>;

            return (
                <div className="flex flex-col text-xs">
                    <span className="font-medium text-gray-900">{typeof date === 'string' ? new Date(date).toLocaleDateString("es-ES") : date.toLocaleDateString("es-ES")}</span>
                    {time && <span className="text-gray-500 text-[10px]">{time}</span>}
                </div>
            );
        }
    },

    {
        accessorKey: "loadingMeters",
        header: ({ column }) => <SortHeader column={column} title="LDM" />,
        cell: ({ row }) => {
            const val = row.getValue("loadingMeters");
            return <div className="text-xs text-right">{typeof val === 'number' ? val.toFixed(1) : '-'}</div>
        }
    },

    // Docs & Actions
    {
        id: "docs",
        header: "Docs",
        cell: ({ row, table }) => (
            <div className="flex items-center gap-2">
                <DocsCell order={row.original} />
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-gray-400 hover:text-blue-600"
                    title="View History"
                    onClick={() => {
                        const isGroup = row.original.isGroupHeader;
                        const ids = isGroup ? row.original.subRows?.map(o => o.id) || [] : [row.original.id];
                        const tpa = row.original.tpaNumber;
                        table.options.meta?.onViewHistory(ids, tpa);
                    }}
                >
                    <HistoryIcon className="h-4 w-4" />
                </Button>
            </div>
        )
    },

    // Process Status (Final)
    {
        id: "processStatus",
        header: "Process Status",
        cell: ({ row }) => {
            const status = row.original.status;
            let label = "PENDING";
            let colorClass = "bg-gray-100 text-gray-600";

            if (status === 'REQUESTED' || status === 'BOOKING_REQUESTED') {
                label = "APT. REQUESTED";
                colorClass = "bg-yellow-100 text-yellow-700 border-yellow-200";
            } else if (status === 'APT_BOOKED') {
                label = "APT. BOOKED";
                colorClass = "bg-blue-100 text-blue-700 border-blue-200";
            } else if (status === 'APT_RESERVED') {
                label = "APT. RESERVED";
                colorClass = "bg-purple-100 text-purple-700 border-purple-200";
            } else if (status === 'ACCEPTED' || status === 'BOOKING_CONFIRMED' || status === 'PLANNED') {
                label = "PLANNED";
                colorClass = "bg-emerald-100 text-emerald-700 border-emerald-200";
            } else if (status === 'REJECTED') {
                label = "REJECTED";
                colorClass = "bg-red-50 text-red-600 border-red-100";
            } else if (status === 'CONSOLIDATION_REQUESTED') {
                label = "CONSOLIDATION";
                colorClass = "bg-orange-100 text-orange-700 border-orange-200";
            }

            return (
                <Badge variant="outline" className={cn("whitespace-nowrap font-medium", colorClass)}>
                    {label}
                </Badge>
            )
        }
    }
];
