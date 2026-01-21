"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { SalesOrderRow } from "@/types"
import { AlertCircle, Plus, Minus } from "lucide-react"
import { DeliveryInstructionFlag } from "@/components/delivery-instruction-flag"
import { cn } from "@/lib/utils"

// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.
export type Order = SalesOrderRow;

export const columns: ColumnDef<Order>[] = [
    {
        id: "select",
        header: ({ table }) => (
            <Checkbox
                checked={
                    table.getIsAllPageRowsSelected() ||
                    (table.getIsSomePageRowsSelected() && "indeterminate")
                }
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
        accessorKey: "requestedShippingDate",
        header: "ShipDate",
        cell: ({ row }) => {
            const date = new Date(row.getValue("requestedShippingDate"));
            return <div className="text-xs whitespace-nowrap">{date.toLocaleDateString("de-DE")}</div>
        }
    },
    {
        accessorKey: "orderReferenceNumber",
        header: "Reference",
        cell: ({ row }) => {
            const val = row.getValue("orderReferenceNumber") as string;
            // @ts-ignore
            if (row.original.isGroupHeader) {
                return (
                    <div className="flex items-center font-bold text-gray-600 pl-2">
                        {val}
                    </div>
                )
            }
            return <div className="text-xs font-medium">{val}</div>
        }
    },
    {
        accessorKey: "tpaNumber",
        header: "TPA #",
        cell: ({ row }) => {
            const val = row.getValue("tpaNumber") as string;
            // @ts-ignore
            const count = row.original.tpaNumberSoCount as number;
            // @ts-ignore
            const isHeader = row.original.isTpaHeader;

            if (!val) return <span className="text-gray-300">-</span>;

            return (
                <div
                    className="flex flex-col cursor-pointer hover:bg-gray-100 p-1 rounded transition-colors group"
                    onClick={row.getToggleExpandedHandler()}
                >
                    <div className="flex items-center gap-1">
                        {row.getCanExpand() && (
                            <button
                                className="h-4 w-4 flex items-center justify-center bg-blue-50 text-blue-600 rounded-sm"
                            >
                                {row.getIsExpanded() ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                            </button>
                        )}
                        <span
                            className={`text-[10px] font-mono whitespace-nowrap font-bold text-blue-800 ${isHeader ? '' : 'overflow-hidden text-ellipsis max-w-[120px]'}`}
                            title={val}
                        >
                            {val}
                        </span>
                    </div>

                    {count > 1 && isHeader && <Badge variant="secondary" className="text-[8px] h-3 px-1 w-fit bg-blue-50 text-blue-700 mt-1">{count} Orders</Badge>}
                </div>
            )
        }
    },
    // REMOVED: "#SO" column per user request
    {
        accessorKey: "shipToAddress", // ShipToId
        header: "ShipTo ID",
        cell: ({ row }) => {
            const val = row.getValue("shipToAddress") as string;
            const isNon = row.original.isNonConsolidation;

            return (
                <div className="flex flex-col">
                    <span className="text-xs font-mono">{val}</span>
                    {isNon && <Badge variant="destructive" className="text-[9px] h-4 px-1 w-fit">No-So-Cons</Badge>}
                </div>
            )
        }
    },
    {
        accessorKey: "priorityLevel",
        header: "Prio",
        cell: ({ row }) => {
            const prio = row.getValue("priorityLevel") as number;
            return prio > 1 ? <AlertCircle className="h-4 w-4 text-red-500" /> : null;
        }
    },
    {
        accessorKey: "zipCode",
        header: "Zip",
        cell: ({ row }) => <div className="text-xs font-mono">{row.getValue("zipCode")}</div>
    },
    {
        accessorKey: "country",
        header: "Ctry",
        cell: ({ row }) => <div className="text-xs">{row.getValue("country")}</div>
    },
    {
        accessorKey: "cityInitials",
        header: "City",
        cell: ({ row }) => <div className="text-xs font-semibold">{row.getValue("cityInitials") || <span className="text-gray-300">-</span>}</div>
    },
    {
        accessorKey: "consignee",
        header: "Consignee",
        cell: ({ row }) => <div className="text-xs truncate max-w-[120px]" title={row.getValue("consignee") as string || ""}>{row.getValue("consignee") || "-"}</div>
    },
    {
        accessorKey: "weight",
        header: "Wgt (kg)",
        cell: ({ row }) => <div className="text-xs text-right">{Number(row.getValue("weight")).toFixed(1)}</div>
    },
    {
        accessorKey: "cartonQuantity",
        header: "PCS",
        cell: ({ row }) => <div className="text-xs text-right">{row.getValue("cartonQuantity")}</div>
    },
    // New: Booking Type
    {
        accessorKey: "bookingType",
        header: "Booking",
        cell: ({ row }) => {
            // @ts-ignore
            const type = (row.original.bookingType || "STD") as string;
            // @ts-ignore
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
    {
        accessorKey: "volumeM3",
        header: "VOL",
        cell: ({ row }) => <div className="text-xs text-right">{Number(row.getValue("volumeM3")).toFixed(2)}</div>
    },
    {
        accessorKey: "loadingMeters",
        header: "LDM",
        cell: ({ row }) => {
            const val = row.getValue("loadingMeters");
            return <div className="text-xs text-right">{typeof val === 'number' ? val.toFixed(2) : '-'}</div>
        }
    },
    {
        accessorKey: "ldmAllocated",
        header: "Alloc LDM",
        cell: ({ row }) => {
            const val = row.getValue("ldmAllocated");
            // @ts-ignore
            const tpaLdm = row.original.tpaTotalLdm;
            if (typeof val !== 'number') return <span className="text-gray-300">-</span>;
            return (
                <div className="flex flex-col text-right">
                    <span className="text-xs font-bold text-green-700">{val.toFixed(2)}</span>
                    {/* @ts-ignore */}
                    {tpaLdm && <span className="text-[9px] text-gray-400">of {Number(tpaLdm).toFixed(2)}</span>}
                </div>
            )
        }
    },
    {
        accessorKey: "pallets",
        header: "N.Pal",
        cell: ({ row }) => {
            const val = row.getValue("pallets");
            // Coupled to LDM as requested: "Only show after Calculate"
            // If LDM is not calculated (null or 0), assume Pallets not calculated either.
            const ldm = row.getValue("loadingMeters");
            if (!ldm || Number(ldm) === 0) return <div className="text-xs text-right">-</div>;

            return <div className="text-xs text-right">{typeof val === 'number' && val > 0 ? val : '-'}</div>
        }
    },
    {
        accessorKey: "incoterm",
        header: "Inco",
        cell: ({ row }) => <div className="text-xs">{row.getValue("incoterm")}</div>
    },
    {
        accessorKey: "shippingType",
        header: "Type",
        cell: ({ row }) => {
            const originalType = row.getValue("shippingType") as string;
            // @ts-ignore
            const effectiveType = row.original.effectiveShipmentType as string | null;

            // Display Effective if it exists, otherwise Original
            const displayType = effectiveType || originalType;
            const isModified = effectiveType && effectiveType !== originalType;

            let color = "secondary";
            // Colors: Direct (Blue/Cyan), Groupage (Orange), Parcel (Yellow/Green)
            if (displayType.includes("DIRECT")) color = "default";
            if (displayType === "GROUPAGE") color = "outline";
            if (displayType === "PARCEL") color = "secondary";

            // Custom class mapping
            let className = "text-[10px] px-1 py-0 h-5 font-normal";
            if (displayType.includes("DIRECT")) className += " bg-purple-100 text-purple-800 hover:bg-purple-100";
            if (displayType === "GROUPAGE") className += " bg-orange-100 text-orange-800 hover:bg-orange-100";
            if (displayType === "PARCEL") className += " bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-0";

            return (
                <div className="flex flex-col items-start gap-1">
                    <Badge variant="outline" className={className}>
                        {displayType.replace('_', ' ')}
                    </Badge>
                    {isModified && (
                        <span className="text-[8px] text-gray-400 line-through">
                            {originalType.replace('_LTL', '').replace('_FTL', '')}
                        </span>
                    )}
                </div>
            )
        }
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
            const status = row.getValue("status") as string;
            // Colors
            let badgeClass = "text-[10px] px-1 py-0 h-5 font-normal";
            let label = status;

            if (status === 'ON_HOLD') {
                return (
                    <Badge className="bg-red-600 text-[10px] px-1 py-0 h-5 border-0 hover:bg-red-700">
                        Blocked
                    </Badge>
                )
            }
            if (status === 'BLOCKED') {
                return (
                    <Badge className="bg-red-600 text-[10px] px-1 py-0 h-5 border-0 hover:bg-red-700">
                        Blocked
                    </Badge>
                )
            }

            if (status === 'OPEN') badgeClass += " bg-slate-100 text-slate-800 border-0";
            if (status === 'PALLET_CALC_REQUESTED') {
                badgeClass += " bg-blue-100 text-blue-800 border-0";
                label = "P.Calc";
            }
            if (status === 'CALCULATED') {
                badgeClass += " bg-cyan-100 text-cyan-800 border-0";
                label = "Calc";
            }
            if (status === 'PLANNED') badgeClass += " bg-green-100 text-green-800 border-0";
            if (status === 'GROUPED') badgeClass += " bg-orange-100 text-orange-800 border-0";

            return (
                <Badge variant="outline" className={badgeClass}>
                    {label}
                </Badge>
            )
        },
    },
    {
        id: "deliveryInstruction",
        enableHiding: false,
        cell: ({ row }) => {
            // @ts-ignore
            const instructions = row.original.deliveryInstruction
            if (!instructions) return null
            return <DeliveryInstructionFlag instruction={instructions} />
        }
    },
]
