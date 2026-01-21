"use client"

import { useState } from "react"
import { DirectDataTable } from "./data-table"
import { directColumns, DirectOrderRow } from "./columns"
import { StatusTiles } from "./status-tiles"
import { CarrierAssignmentModal } from "@/components/direct-planning/carrier-assignment-modal"

import { ReMixDialog } from "@/components/remix-dialog"
import { ExecPlanDialog } from "@/components/exec-plan-dialog" // Import
import { planDirectOrdersAction } from "./actions";
import { Play, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DirectOrdersClientProps {
    orders: DirectOrderRow[]
}

import { useMemo } from "react";

// Helper to group orders
function groupDirectOrders(orders: DirectOrderRow[]): DirectOrderRow[] {
    const groups: Record<string, DirectOrderRow[]> = {};
    const standalone: DirectOrderRow[] = [];

    // 1. Bucket by TPA
    // 1. Bucket by TPA
    orders.forEach(o => {
        // @ts-ignore
        if (o.tpaNumber) {
            if (!groups[o.tpaNumber]) groups[o.tpaNumber] = [];
            groups[o.tpaNumber].push(o);
        } else {
            standalone.push(o);
        }
    });

    // 2. Create Header Rows
    const groupRows = Object.entries(groups).map(([tpa, items]) => {
        // Calculate Aggregates
        const totalWeight = items.reduce((sum, i) => sum + (i.weight || 0), 0);
        const totalPallets = items.reduce((sum, i) => sum + (i.pallets || 0), 0);
        const totalVol = items.reduce((sum, i) => sum + (i.volumeM3 || 0), 0);
        const totalLdm = items.reduce((sum, i) => sum + (i.loadingMeters || 0), 0);
        const totalLdmAlloc = items.reduce((sum, i) => sum + (i.ldmAllocated || 0), 0);
        const totalPcs = items.reduce((sum, i) => sum + (i.cartonQuantity || 0), 0);

        // Country Logic
        const uniqueCountries = Array.from(new Set(items.map(i => i.country)));
        const displayCountry = uniqueCountries.length > 1 ? "MIX" : uniqueCountries[0];

        // Booking Aggregate Logic
        const uniqueTypes = Array.from(new Set(items.map(i => i.bookingType || "STD")));
        const displayType = uniqueTypes.length === 1 ? uniqueTypes[0] : "MIX";

        let displayManager: string | undefined = undefined;
        if (displayType === "APT") {
            const uniqueManagers = Array.from(new Set(items.filter(i => i.bookingType === 'APT').map(i => i.bookingManager || "CARRIER")));
            displayManager = uniqueManagers.length === 1 ? uniqueManagers[0] : "MIX";
        }

        // Use the first order for shared props, but mark as header
        const header: DirectOrderRow & { isGroupHeader?: boolean, subRows?: DirectOrderRow[] } = {
            ...items[0],
            id: `GROUP-${tpa}`,
            tpaNumber: tpa,
            country: displayCountry, // Override country
            // Overrides for Booking
            bookingType: displayType,
            bookingManager: displayManager,

            // Aggregates
            weight: totalWeight,
            pallets: totalPallets,
            volumeM3: totalVol,
            loadingMeters: totalLdm,
            ldmAllocated: totalLdmAlloc,
            cartonQuantity: totalPcs,
            // Header Flags
            isGroupHeader: true,
            subRows: items
        };
        return header;
    });

    return [...groupRows, ...standalone];
}

export function DirectOrdersClient({ orders }: DirectOrdersClientProps) {
    const groupedOrders = useMemo(() => groupDirectOrders(orders), [orders]);

    const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
    // const [execLoading, setExecLoading] = useState(false); // Removed as dialog handles it

    // Flatten selection to include group children
    const selectedOrderIds = useMemo(() => {
        const ids = new Set<string>();
        Object.keys(rowSelection).forEach(key => {
            if (!rowSelection[key]) return;

            if (key.startsWith('GROUP-')) {
                // Find group and add children
                const group = groupedOrders.find(g => g.id === key);
                if (group && group.subRows) {
                    group.subRows.forEach(sub => ids.add(sub.id));
                }
            } else {
                ids.add(key);
            }
        });
        return Array.from(ids);
    }, [rowSelection, groupedOrders]);

    // Get full objects for validation
    const selectedOrders = orders.filter(o => selectedOrderIds.includes(o.id));

    // Check if ALL selected are ACCEPTED
    const allAccepted = selectedOrders.length > 0 && selectedOrders.every(o => o.status === 'ACCEPTED');

    const handleExecPlan = async () => {
        // if (!confirm(`Are you sure you want to PLAN ${selectedOrders.length} accepted orders?`)) return; // Removed, dialog handles confirmation

        // setExecLoading(true); // Removed as dialog handles it
        try {
            await planDirectOrdersAction(selectedOrderIds);
            setRowSelection({});
        } catch (error) {
            alert("Failed to plan orders");
            console.error(error);
        } finally {
            // setExecLoading(false); // Removed as dialog handles it
        }
    };

    return (
        <div className="h-full flex flex-col space-y-6">
            <StatusTiles orders={orders} />

            <div className="flex justify-end gap-2">
                {selectedOrderIds.length > 0 && (
                    <>
                        <ReMixDialog
                            selectedOrders={selectedOrders}
                            onSuccess={() => setRowSelection({})}
                        />

                        <ExecPlanDialog
                            selectedOrders={selectedOrders}
                            onConfirm={handleExecPlan}
                            disabled={!allAccepted}
                        />
                    </>
                )
                }

                <CarrierAssignmentModal
                    selectedOrderIds={selectedOrderIds}
                    onSuccess={() => setRowSelection({})}
                />
            </div >

            <DirectDataTable
                columns={directColumns}
                data={groupedOrders}
                rowSelection={rowSelection}
                onRowSelectionChange={(updaterOrValue: any) => {
                    const newValue = typeof updaterOrValue === 'function'
                        ? updaterOrValue(rowSelection)
                        : updaterOrValue;

                    // Cascading Logic: Check for Header Toggles
                    const newSelection = { ...newValue };

                    // Find which headers changed state
                    // Actually, simpler approach: For every selected Header, ensure children are selected.
                    // For every unselected Header, ensure children are unselected (if previously selected via header? Hard to track source).
                    // Better interaction: Detect the *change*.
                    // But TanStack table gives us the *final* state.

                    // Iterating groups to sync children with header
                    Object.keys(newSelection).forEach(key => {
                        if (key.startsWith('GROUP-') && newSelection[key] === true && !rowSelection[key]) {
                            // Header JUST Selected -> Select All Children
                            const groupId = key;
                            const group = groupedOrders.find(g => g.id === groupId);
                            if (group && group.subRows) {
                                group.subRows.forEach(sub => {
                                    newSelection[sub.id] = true;
                                });
                            }
                        }
                    });

                    // Handle Deselection? 
                    // If Header exists in OLD selection (true) and NOT in NEW selection (false/undefined) -> Deselect Children
                    Object.keys(rowSelection).forEach(key => {
                        if (key.startsWith('GROUP-') && rowSelection[key] === true && !newSelection[key]) {
                            // Header JUST Deselected -> Deselect All Children
                            const groupId = key;
                            const group = groupedOrders.find(g => g.id === groupId);
                            if (group && group.subRows) {
                                group.subRows.forEach(sub => {
                                    delete newSelection[sub.id];
                                });
                            }
                        }
                    });

                    setRowSelection(newSelection);
                }}
            />
        </div >
    )
}
