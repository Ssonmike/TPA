"use client"

import { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { acceptShipmentAction, rejectShipmentAction, requestConsolidationAction, bulkStatusAction, updateBulkAppointmentAction } from "./actions";
import { Check, X, LogOut, Loader2, Layers, Calendar, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { CBAOrder, cbaColumns } from "./cba-columns";
import { CBADataTable } from "./data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"; // Assuming exists
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { HistorySheet } from "./cba-history";

interface CBAClientProps {
    orders: CBAOrder[]
    carrierId: string
}

// Grouping Helper
function groupCbaOrders(orders: CBAOrder[]) {
    const grouped: any[] = [];
    const tpaMap = new Map<string, CBAOrder[]>();
    const singles: CBAOrder[] = [];

    // 1. Separate by TPA
    orders.forEach(o => {
        if (o.tpaNumber) {
            if (!tpaMap.has(o.tpaNumber)) tpaMap.set(o.tpaNumber, []);
            tpaMap.get(o.tpaNumber)!.push(o);
        } else {
            singles.push(o);
        }
    });

    // 2. Process Groups
    tpaMap.forEach((groupOrders, tpaNumber) => {
        // Calculate Aggregates
        const totalWeight = groupOrders.reduce((sum, o) => sum + o.weight, 0);
        const totalPallets = groupOrders.reduce((sum, o) => sum + o.pallets, 0);
        const totalCartons = groupOrders.reduce((sum, o) => sum + o.cartonQuantity, 0);
        const totalLdm = groupOrders.reduce((sum, o) => sum + (o.loadingMeters || 0), 0);

        // Booking Aggregate Logic
        const uniqueTypes = Array.from(new Set(groupOrders.map(i => i.bookingType || "STD")));
        const displayType = uniqueTypes.length === 1 ? uniqueTypes[0] : "MIX";

        let displayManager: string | undefined = undefined;
        if (displayType === "APT") {
            const uniqueManagers = Array.from(new Set(groupOrders.filter(i => i.bookingType === 'APT').map(i => i.bookingManager || "CARRIER")));
            displayManager = uniqueManagers.length === 1 ? uniqueManagers[0] : "MIX";
        }


        // Pick representative fields from first order
        const first = groupOrders[0];

        // Consignee Aggregate
        const uniqueConsignees = Array.from(new Set(groupOrders.map(i => i.consignee || "").filter(Boolean)));
        const displayConsignee = uniqueConsignees.length === 1 ? uniqueConsignees[0] : (uniqueConsignees.length > 1 ? "MIX" : "");

        const headerRow = {
            id: `GROUP-${tpaNumber}`,
            tpaNumber: tpaNumber,
            isGroupHeader: true,
            // Header Aggregates
            weight: totalWeight,
            pallets: totalPallets,
            cartonQuantity: totalCartons,
            loadingMeters: totalLdm,

            // Booking Aggregates
            bookingType: displayType,
            bookingManager: displayManager,

            // Representative fields
            shipToCountry: first.shipToCountry,
            shipToCity: first.shipToCity,
            firstPickupDate: first.firstPickupDate,

            // Sync Dates to Header
            confirmedDeliveryDate: first.confirmedDeliveryDate,
            confirmedDeliveryTime: first.confirmedDeliveryTime,
            actualPickupDate: first.actualPickupDate,
            pickUpTime: first.pickUpTime,

            status: first.status,

            subRows: groupOrders,
            // Header display fields
            orderReferenceNumber: "",
            consignee: displayConsignee, // Set calculated consignee for header
            carrierName: first.carrierName
        };
        grouped.push(headerRow);
    });

    // 3. Add singles
    grouped.push(...singles);

    return grouped;
}


export function CBAClient({ orders, carrierId }: CBAClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const view = searchParams.get('view') || 'dashboard'; // 'dashboard' | 'history'

    const [loadingMap, setLoadingMap] = useState<Record<string, string>>({});
    const [rowSelection, setRowSelection] = useState({});
    const [isConsolidating, setIsConsolidating] = useState(false);

    // History State
    const [historyOpen, setHistoryOpen] = useState(false);
    const [historyOrderIds, setHistoryOrderIds] = useState<string[]>([]);
    const [historyTpa, setHistoryTpa] = useState<string | undefined>(undefined);

    // Polling
    useEffect(() => {
        const interval = setInterval(() => {
            router.refresh();
        }, 5000);
        return () => clearInterval(interval);
    }, [router]);

    const handleAction = async (orderId: string, action: 'accept' | 'reject') => {
        setLoadingMap(prev => ({ ...prev, [orderId]: action }));
        if (action === 'accept') await acceptShipmentAction(orderId);
        else await rejectShipmentAction(orderId);
        setLoadingMap(prev => {
            const next = { ...prev };
            delete next[orderId];
            return next;
        });
        // Deselect if actionable
        if (rowSelection[orderId as keyof typeof rowSelection]) {
            setRowSelection(prev => {
                const next = { ...prev };
                delete next[orderId as keyof typeof next];
                return next;
            });
        }
    };

    const handleConsolidationRequest = async () => {
        const selectedIds = Object.keys(rowSelection).filter(k => rowSelection[k as keyof typeof rowSelection] && !k.startsWith('GROUP-'));
        if (selectedIds.length === 0) return;

        setIsConsolidating(true);
        await requestConsolidationAction(selectedIds); // Updated to use just array of IDs
        setIsConsolidating(false);
        setRowSelection({});
        alert("Solicitud de consolidación enviada al Control Tower");
    };

    // NEW: Filter State for Tiles
    const [activeTileFilter, setActiveTileFilter] = useState<string[] | null>(null);

    // Counts
    const aptRequestedCount = orders.filter(o => o.status === 'REQUESTED' || o.status === 'BOOKING_REQUESTED').length;
    const aptBookedCount = orders.filter(o => o.status === 'APT_BOOKED').length;
    const aptReservedCount = orders.filter(o => o.status === 'APT_RESERVED').length;
    const acceptedCount = orders.filter(o => o.status === 'ACCEPTED' || o.status === 'BOOKING_RECEIVED' || o.status === 'BOOKING_CONFIRMED').length;
    const rejectedCount = orders.filter(o => o.status === 'REJECTED').length;

    // Filter Logic
    const baseOpenStatuses = ['REQUESTED', 'BOOKING_REQUESTED', 'BOOKING_RECEIVED', 'APT_BOOKED', 'APT_RESERVED'];

    const openOrders = useMemo(() => {
        let filtered = carrierId === 'CT' ? orders : orders.filter(o => baseOpenStatuses.includes(o.status));

        // Apply Tile Filter if Active
        if (activeTileFilter) {
            filtered = filtered.filter(o => activeTileFilter.includes(o.status));
        }

        return filtered;
    }, [orders, carrierId, activeTileFilter]);

    const historyOrders = carrierId === 'CT'
        ? orders
        : orders.filter(o => ['ACCEPTED', 'REJECTED', 'PLANNED', 'CLOSED', 'CONSOLIDATION_REQUESTED', 'BOOKING_CONFIRMED'].includes(o.status));

    const currentData = view === 'history' ? historyOrders : openOrders;

    const isHistory = view === 'history';

    // Grouping
    const groupedData = useMemo(() => groupCbaOrders(currentData), [currentData]);

    // Enhanced Columns with Actions
    const columns = useMemo(() => {
        // Use defined columns directly
        const cols: ColumnDef<CBAOrder>[] = [...cbaColumns];

        // Override actions column to use local handler
        const actionColIndex = cols.findIndex(c => c.id === 'actions');
        if (actionColIndex !== -1) {
            cols[actionColIndex] = {
                ...cols[actionColIndex],
                cell: ({ row }) => {
                    // @ts-ignore
                    if (row.original.isGroupHeader) return null;

                    const order = row.original;
                    const isLoading = loadingMap[order.id];

                    // Only show for REQUESTED or BOOKING_REQUESTED
                    if (order.status !== 'REQUESTED' && order.status !== 'BOOKING_REQUESTED') return null;

                    return (
                        <div className="flex items-center gap-1">
                            <Button
                                size="sm" variant="ghost" className="h-6 w-6 p-0 hover:bg-green-100 text-green-600"
                                onClick={() => handleAction(order.id, 'accept')}
                                disabled={!!isLoading}
                            >
                                {isLoading === 'accept' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                            </Button>
                            <Button
                                size="sm" variant="ghost" className="h-6 w-6 p-0 hover:bg-red-100 text-red-600"
                                onClick={() => handleAction(order.id, 'reject')}
                                disabled={!!isLoading}
                            >
                                {isLoading === 'reject' ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                            </Button>
                        </div>
                    );
                }
            };
        }

        return cols;
    }, [loadingMap]);


    // Bulk Action State
    const [dateDialogOpen, setDateDialogOpen] = useState(false);
    const [dateUpdateType, setDateUpdateType] = useState<'delivery' | 'pickup'>('delivery');
    const [bulkDate, setBulkDate] = useState<Date | undefined>(undefined);
    const [bulkTime, setBulkTime] = useState("");
    const [isBulkUpdating, setIsBulkUpdating] = useState(false);

    // Handlers
    const getSelectedIds = () => {
        return Object.keys(rowSelection)
            .filter(k => rowSelection[k as keyof typeof rowSelection] && !k.startsWith('GROUP-'));
    };

    const handleBulkStatus = async (status: 'ACCEPTED' | 'REJECTED' | 'BOOKING_CONFIRMED') => {
        const ids = getSelectedIds();
        if (!ids.length) return;
        setIsBulkUpdating(true);
        try {
            await bulkStatusAction(ids, status);
            toast.success(`Updated ${ids.length} orders`);
            setRowSelection({});
        } catch (e) {
            toast.error("Failed to update status");
        } finally {
            setIsBulkUpdating(false);
        }
    };

    const openDateDialog = (type: 'delivery' | 'pickup') => {
        setDateUpdateType(type);
        setBulkDate(undefined);
        setBulkTime("");
        setDateDialogOpen(true);
    };

    const handleBulkDateSave = async () => {
        const ids = getSelectedIds();
        setIsBulkUpdating(true);
        try {
            const payload: any = {};
            if (dateUpdateType === 'delivery') {
                payload.confirmedDeliveryDate = bulkDate;
                payload.confirmedDeliveryTime = bulkTime;
            } else {
                payload.actualPickupDate = bulkDate;
                payload.pickUpTime = bulkTime;
            }
            const res = await updateBulkAppointmentAction(ids, payload);
            if (res.success) {
                toast.success(`Dates updated. Logs created: ${res.logsCreated || 0}`);
            } else {
                toast.error("Failed update");
            }
            router.refresh();
            setDateDialogOpen(false);
            setRowSelection({});
        } catch (e) {
            toast.error("Failed update");
        } finally {
            setIsBulkUpdating(false);
        }
    };


    const selectedIds = getSelectedIds();
    const selectedCount = selectedIds.length;
    const hasSelection = selectedCount > 0;

    const toggleFilter = (statuses: string[]) => {
        if (activeTileFilter?.join(',') === statuses.join(',')) {
            setActiveTileFilter(null); // Clear
        } else {
            setActiveTileFilter(statuses);
        }
    };

    // Helper for active class
    const getTileClass = (statuses: string[], baseClass: string) => {
        const isActive = activeTileFilter?.join(',') === statuses.join(',');
        return cn(baseClass, "cursor-pointer transition-all hover:opacity-90", isActive ? "ring-2 ring-offset-2 ring-blue-600 scale-105" : "opacity-80 hover:opacity-100");
    };

    // ... (rest of render)

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b h-16 flex items-center px-6 justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <div className="font-bold text-lg text-gray-700">Welcome,</div>
                    <Badge variant="outline" className="text-base px-3 py-1 bg-slate-100">
                        {carrierId === 'CT' ? 'Control Tower' : carrierId}
                    </Badge>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => router.push('/cba')}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Switch Identity
                    </Button>
                </div>
            </header>

            {/* Date Dialog - PRESERVED */}
            <Dialog open={dateDialogOpen} onOpenChange={setDateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Update {dateUpdateType === 'delivery' ? 'Delivery' : 'Pick Up'} Date</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="flex flex-col gap-2">
                            <Label>Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !bulkDate && "text-muted-foreground")}>
                                        <Calendar className="mr-2 h-4 w-4" />
                                        {bulkDate ? format(bulkDate, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <CalendarComponent mode="single" selected={bulkDate} onSelect={setBulkDate} initialFocus />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label>Time (HH:mm)</Label>
                            <Input value={bulkTime} onChange={e => setBulkTime(e.target.value)} placeholder="09:00" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDateDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleBulkDateSave} disabled={isBulkUpdating}>
                            {isBulkUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <main className="flex-1 p-6 space-y-6 max-w-[1600px] mx-auto w-full">
                {/* Metrics Tiles (Interactive) */}
                <div className="grid grid-cols-5 gap-4">
                    {/* Appointment Requested */}
                    <Card
                        className={getTileClass(['REQUESTED', 'BOOKING_REQUESTED'], "border-l-4 border-l-yellow-500 shadow-sm")}
                        onClick={() => toggleFilter(['REQUESTED', 'BOOKING_REQUESTED'])}
                    >
                        <CardHeader className="p-4 pb-2"><CardTitle className="text-sm text-yellow-700 font-bold uppercase tracking-wider">Appointment Requested</CardTitle></CardHeader>
                        <CardContent className="p-4 pt-0 text-3xl font-bold text-gray-900">{aptRequestedCount}</CardContent>
                    </Card>

                    {/* Appointment Reserved */}
                    <Card
                        className={getTileClass(['APT_RESERVED'], "border-l-4 border-l-purple-500 shadow-sm")}
                        onClick={() => toggleFilter(['APT_RESERVED'])}
                    >
                        <CardHeader className="p-4 pb-2"><CardTitle className="text-sm text-purple-700 font-bold uppercase tracking-wider">Appointment Reserved</CardTitle></CardHeader>
                        <CardContent className="p-4 pt-0 text-3xl font-bold text-gray-900">{aptReservedCount}</CardContent>
                    </Card>

                    {/* Appointment Booked */}
                    <Card
                        className={getTileClass(['APT_BOOKED'], "border-l-4 border-l-blue-500 shadow-sm")}
                        onClick={() => toggleFilter(['APT_BOOKED'])}
                    >
                        <CardHeader className="p-4 pb-2"><CardTitle className="text-sm text-blue-700 font-bold uppercase tracking-wider">Appointment Booked</CardTitle></CardHeader>
                        <CardContent className="p-4 pt-0 text-3xl font-bold text-gray-900">{aptBookedCount}</CardContent>
                    </Card>

                    {/* Accepted */}
                    <Card
                        className="border-l-4 border-l-emerald-500 shadow-sm opacity-60" // Valid for History context only really
                    >
                        <CardHeader className="p-4 pb-2"><CardTitle className="text-sm text-muted-foreground uppercase">Accepted / Planned</CardTitle></CardHeader>
                        <CardContent className="p-4 pt-0 text-3xl font-bold text-gray-900">{acceptedCount}</CardContent>
                    </Card>

                    {/* Rejected */}
                    <Card className="border-l-4 border-l-red-500 shadow-sm opacity-60">
                        <CardHeader className="p-4 pb-2"><CardTitle className="text-sm text-muted-foreground uppercase">Rejected</CardTitle></CardHeader>
                        <CardContent className="p-4 pt-0 text-3xl font-bold text-gray-900">{rejectedCount}</CardContent>
                    </Card>
                </div>

                {/* Main Content Table (Replaces Tabs) */}
                <Card className="shadow-sm">
                    <div className="px-6 py-4 border-b flex items-center justify-between bg-white rounded-t-lg">
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-bold text-gray-800">
                                {isHistory ? 'History (Closed Tasks)' : 'Dashboard (Open Tasks)'}
                            </h2>
                            <Badge variant="secondary" className="ml-2">{currentData.length}</Badge>
                        </div>

                        {!isHistory && selectedCount > 0 && (
                            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4">
                                {/* Date Actions */}
                                <Button variant="outline" size="sm" className="border-blue-300 text-blue-700 hover:bg-blue-50" onClick={() => openDateDialog('delivery')}>
                                    <Calendar className="mr-2 h-4 w-4" /> Update Delivery
                                </Button>
                                <Button variant="outline" size="sm" className="border-blue-300 text-blue-700 hover:bg-blue-50" onClick={() => openDateDialog('pickup')}>
                                    <Calendar className="mr-2 h-4 w-4" /> Update Pick Up
                                </Button>

                                <div className="w-px h-6 bg-gray-300 mx-2" />

                                {/* Consolidation */}
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 hover:text-orange-800"
                                    onClick={handleConsolidationRequest}
                                    disabled={isConsolidating}
                                >
                                    {isConsolidating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Layers className="h-4 w-4 mr-2" />}
                                    Req. Consolidation
                                </Button>

                                <div className="w-px h-6 bg-gray-300 mx-2" />

                                {/* Status Actions */}
                                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleBulkStatus('ACCEPTED')}>
                                    <Check className="mr-2 h-4 w-4" /> Confirm
                                </Button>
                                <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => handleBulkStatus('REJECTED')}>
                                    <X className="mr-2 h-4 w-4" /> Reject
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="p-0">
                        <CBADataTable
                            columns={columns}
                            data={groupedData}
                            rowSelection={rowSelection}
                            onRowSelectionChange={setRowSelection}
                            meta={{
                                onViewHistory: (ids: string[], tpa?: string) => {
                                    setHistoryOrderIds(ids);
                                    setHistoryTpa(tpa);
                                    setHistoryOpen(true);
                                }
                            }}
                        />
                    </div>
                </Card>

                <HistorySheet
                    open={historyOpen}
                    onOpenChange={setHistoryOpen}
                    orderIds={historyOrderIds}
                    tpaNumber={historyTpa}
                />
            </main>
        </div >
    )
}
