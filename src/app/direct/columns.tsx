"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { AlertCircle, ArrowUpDown, Plus, Minus, Star } from "lucide-react"
import { cn } from "@/lib/utils"

import { DeliveryInstructionFlag } from "@/components/delivery-instruction-flag"
import { PlanDirectModal } from "@/components/direct-planning/plan-direct-modal"


// Define the shape of Direct Order Data
// This should match what we fetch from the server
export interface DirectOrderRow {
    id: string
    sapSalesOrderNumber: string
    requestedShippingDate: Date | string
    tpaNumber?: string
    tpaGroupId?: string | null // Visual Grouping Flag
    shipToAddress: string // ShipToId
    priorityLevel: number
    zipCode?: string
    country: string
    cityInitials?: string
    consignee?: string
    weight: number
    cartonQuantity: number
    volumeM3: number
    loadingMeters: number | null
    ldmAllocated?: number
    tpaTotalLdm?: number
    pallets?: number
    incoterm?: string
    shippingType: string
    effectiveShipmentType?: string
    status: string
    // Booking
    bookingType?: string // STD, AVIS, APT
    bookingManager?: string // CARRIER, CT

    deliveryInstruction?: string
    isNonConsolidation?: boolean
    carrierName?: string
    firstPickupDate?: Date
    customer?: {
        customerId: string
    }
    // Hierarchy
    isGroupHeader?: boolean
    subRows?: DirectOrderRow[]
}

// Reusable Header with Sort Only
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

export const directColumns: ColumnDef<DirectOrderRow>[] = [
    // 1. Checkbox Information
    {
        id: "select",
        header: ({ table }) => (
            <div className="flex flex-col items-center justify-center h-full pb-1">
                <Checkbox
                    checked={
                        table.getIsAllPageRowsSelected() ||
                        (table.getIsSomePageRowsSelected() && "indeterminate")
                    }
                    onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                    aria-label="Select all"
                />
            </div>
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

    // 2. Core Info
    {
        accessorKey: "requestedShippingDate",
        header: ({ column }) => <SortHeader column={column} title="ShipDate" />,
        cell: ({ row }) => {
            const date = new Date(row.getValue("requestedShippingDate"));
            return <div className="text-xs whitespace-nowrap">{date.toLocaleDateString("de-DE")}</div>
        }
    },
    {
        accessorKey: "orderReferenceNumber",
        header: ({ column }) => <SortHeader column={column} title="Reference" />,
        cell: ({ row }) => {
            // @ts-ignore
            if (row.original.isGroupHeader) return null;
            return <div className="text-xs font-semibold">{row.getValue("orderReferenceNumber")}</div>
        }
    },
    {
        accessorKey: "tpaNumber",
        header: ({ column }) => <SortHeader column={column} title="TPA #" />,
        cell: ({ row }) => {
            const val = row.getValue("tpaNumber") as string;

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
        accessorKey: "shipToAddress",
        header: ({ column }) => <SortHeader column={column} title="ShipTo ID" />,
        cell: ({ row }) => <div className="text-[10px] text-gray-500 truncate max-w-[80px]">{row.getValue("shipToAddress")}</div>
    },
    {
        accessorKey: "priorityLevel",
        header: ({ column }) => <SortHeader column={column} title="Prio" />,
        cell: ({ row }) => {
            const prio = row.getValue("priorityLevel") as number;
            return prio > 1 ? <AlertCircle className="h-4 w-4 text-red-500" /> : null;
        }
    },
    // Booking Column
    {
        accessorKey: "bookingType", // Accessor matching the data field
        header: ({ column }) => <SortHeader column={column} title="Booking" />,
        cell: ({ row }) => {
            const type = (row.original.bookingType || "STD") as string;

            // Badge Logic
            let badgeClass = "text-[10px] px-1 py-0 h-5 font-bold border ";
            if (type === 'APT') badgeClass += "bg-orange-100 text-orange-800 border-orange-200";
            else if (type === 'AVIS') badgeClass += "bg-blue-100 text-blue-800 border-blue-200";
            else if (type === 'MIX') badgeClass += "bg-slate-100 text-slate-800 border-slate-200"; // MIX
            else badgeClass += "bg-gray-100 text-gray-500 border-gray-200 font-normal"; // STD

            const mgr = row.original.bookingManager;

            return (
                <div className="flex flex-col items-start gap-0.5">
                    <Badge variant="outline" className={badgeClass}>
                        {type}
                    </Badge>
                    {/* Manager Indicator (Only for APT or MIX cases if relevant) */}
                    {(type === 'APT') && (
                        <span className={cn("text-[9px] font-mono leading-none", mgr === 'CT' ? "text-purple-600 font-bold" : "text-gray-400")}>
                            {mgr === 'CT' ? 'CT' : 'CA'}
                        </span>
                    )}
                </div>
            )
        },
        enableColumnFilter: true,
        filterFn: (row, id, value) => {
            // Simple includes check
            const val = row.getValue(id) as string;
            return val?.includes(value);
        }
    },


    {
        accessorKey: "carrierName",
        header: ({ column }) => <SortHeader column={column} title="Carrier" />,
        cell: ({ row }) => {
            const val = row.getValue("carrierName") as string;
            if (!val) return <span className="text-gray-300">-</span>;
            return <div className="text-xs font-bold text-blue-800">{val}</div>
        },
        // Enable default filtering (text input)
        enableColumnFilter: true,
    },

    // 3. Geography
    {
        accessorKey: "zipCode",
        header: ({ column }) => <SortHeader column={column} title="Zip" />,
        cell: ({ row }) => <div className="text-xs font-mono">{row.getValue("zipCode")}</div>
    },
    {
        accessorKey: "country",
        header: ({ column }) => <SortHeader column={column} title="Ctry" />,
        cell: ({ row }) => <div className="text-xs font-bold">{row.getValue("country")}</div>
    },
    {
        accessorKey: "cityInitials",
        header: ({ column }) => <SortHeader column={column} title="City" />,
        cell: ({ row }) => <div className="text-xs font-semibold">{row.getValue("cityInitials") || <span className="text-gray-300">-</span>}</div>
    },
    {
        accessorKey: "consignee",
        header: ({ column }) => <SortHeader column={column} title="Consignee" />,
        cell: ({ row }) => <div className="text-xs truncate max-w-[120px]" title={row.getValue("consignee") as string}>{row.getValue("consignee") || "-"}</div>
    },

    // 4. Metrics
    {
        accessorKey: "weight",
        header: ({ column }) => <SortHeader column={column} title="Wgt (kg)" />,
        cell: ({ row }) => <div className="text-xs text-right">{Number(row.getValue("weight")).toFixed(1)}</div>
    },
    {
        accessorKey: "cartonQuantity",
        header: ({ column }) => <SortHeader column={column} title="PCS" />,
        cell: ({ row }) => <div className="text-xs text-right">{row.getValue("cartonQuantity")}</div>
    },
    {
        accessorKey: "volumeM3",
        header: ({ column }) => <SortHeader column={column} title="VOL" />,
        cell: ({ row }) => <div className="text-xs text-right">{Number(row.getValue("volumeM3")).toFixed(2)}</div>
    },
    {
        accessorKey: "loadingMeters",
        header: ({ column }) => <SortHeader column={column} title="LDM" />,
        cell: ({ row }) => {
            const val = row.getValue("loadingMeters");
            return <div className="text-xs text-right">{typeof val === 'number' ? val.toFixed(2) : '-'}</div>
        }
    },
    {
        accessorKey: "ldmAllocated",
        header: ({ column }) => <SortHeader column={column} title="Alloc LDM" />,
        cell: ({ row }) => {
            const val = row.getValue("ldmAllocated");
            if (typeof val !== 'number') return <span className="text-gray-300">-</span>;
            return <div className="text-xs text-right font-bold text-green-700">{val.toFixed(2)}</div>
        }
    },
    {
        accessorKey: "pallets",
        header: ({ column }) => <SortHeader column={column} title="N.Pal" />,
        cell: ({ row }) => {
            const val = row.getValue("pallets");
            return <div className="text-xs text-right">{typeof val === 'number' && val > 0 ? val : '-'}</div>
        }
    },

    // 5. Logistica
    {
        accessorKey: "incoterm",
        header: ({ column }) => <SortHeader column={column} title="Inco" />,
        cell: ({ row }) => <div className="text-xs">{row.getValue("incoterm")}</div>
    },
    {
        accessorKey: "shippingType",
        header: ({ column }) => <SortHeader column={column} title="Type" />,
        cell: ({ row }) => {
            const originalType = row.getValue("shippingType") as string;
            const effectiveType = row.original.effectiveShipmentType as string | null;
            const displayType = effectiveType || originalType;

            let className = "text-[10px] px-1 py-0 h-5 font-normal";
            if (displayType.includes("DIRECT_FTL")) className += " bg-purple-100 text-purple-800 border-purple-200";
            else if (displayType.includes("DIRECT_LTL")) className += " bg-indigo-100 text-indigo-800 border-indigo-200";
            else if (displayType === "GROUPAGE") className += " bg-orange-100 text-orange-800 border-orange-200";
            else className += " bg-gray-100";

            return <Badge variant="outline" className={className}>{displayType.replace('DIRECT_', '').replace('_', ' ')}</Badge>
        }
    },
    // HIGH CONTRAST STATUS BADGES
    {
        accessorKey: "status",
        header: ({ column }) => <SortHeader column={column} title="Status" />,
        cell: ({ row }) => {
            const rawStatus = row.getValue("status") as string;

            // VISUAL MAPPING: CALCULATED implies "Ready to Assign" -> OPEN
            let status = rawStatus;
            if (status === 'CALCULATED') status = 'OPEN';

            let badgeClass = "text-[10px] px-2 py-0.5 h-5 font-semibold border-0 ";

            // High Contrast Palette & New Lifecycle
            if (status === 'OPEN') badgeClass += "bg-amber-500 text-white hover:bg-amber-600";
            else if (status === 'REQUESTED') badgeClass += "bg-blue-400 text-white hover:bg-blue-500";
            else if (status === 'ACCEPTED') badgeClass += "bg-teal-500 text-white hover:bg-teal-600";
            else if (status === 'REJECTED') badgeClass += "bg-red-500 text-white hover:bg-red-600";
            else if (status === 'PLANNED') badgeClass += "bg-indigo-500 text-white hover:bg-indigo-600";
            else if (status === 'CLOSED') badgeClass += "bg-slate-700 text-white hover:bg-slate-800";
            else if (status === 'CONSOLIDATION_REQUESTED') badgeClass += "bg-orange-500 text-white hover:bg-orange-600 flex gap-1 items-center";
            else badgeClass += "bg-gray-400 text-white";

            return (
                <Badge className={badgeClass}>
                    {status === 'CONSOLIDATION_REQUESTED' && <AlertCircle className="h-3 w-3 text-white" />}
                    {status.replace('_', ' ')}
                </Badge>
            )
        }
    },

]
