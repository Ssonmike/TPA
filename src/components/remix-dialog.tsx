"use client"

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { recalculateOrtecAction } from "@/app/planning/remix-action"
import { RefreshCw, Calculator } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface ReMixDialogProps {
    selectedOrders: any[] // SalesOrder type
    onSuccess: () => void
}

export function ReMixDialog({ selectedOrders, onSuccess }: ReMixDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    // Validation: Accept ALL selected orders
    const validOrders = selectedOrders;
    const invalidCount = 0;

    // Stats
    const distinctTpas = Array.from(new Set(validOrders.map(o => o.tpaNumber).filter(Boolean)))

    // CORRECTED: Parcel LDM MUST be included in total
    const estimatedLdm = validOrders.reduce((sum, o) => {
        let ldm = Number(o.loadingMeters);

        // If 0, check ldmAllocated (from previous calc)
        if (!ldm) ldm = Number(o.ldmAllocated);

        // If still 0 (e.g. Unplanned Parcel), calculate from Volume
        if (!ldm) {
            const vol = Number(o.volumeM3) || 0;
            const pallets = Math.ceil(vol / 1.2);
            ldm = Number((pallets * 0.42).toFixed(2));
        }
        return sum + (ldm || 0);
    }, 0);

    // Preview Effective Type - Strict Hierarchy
    let effectiveType = "GROUPAGE";

    const isDirect = validOrders.some(o => o.shippingType?.includes('DIRECT'));
    const allParcel = validOrders.every(o => o.shippingType === 'PARCEL');

    if (isDirect) {
        effectiveType = "DIRECT";
    } else if (estimatedLdm > 3.0) {
        effectiveType = "DIRECT";
    } else if (allParcel) {
        effectiveType = "PARCEL";
    } else {
        // Mixed (Parcel + Groupage) or Groupage Only, <= 3.0
        effectiveType = "GROUPAGE";
    }

    const handleConfirm = async () => {
        try {
            setLoading(true)

            // Filter out virtual header IDs (TPA-VIRTUAL-xxx)
            // Only send real Sales Order UUIDs to the backend
            const ids = validOrders
                .filter(o => o.id && !o.id.startsWith('TPA-VIRTUAL'))
                .map(o => o.id);

            console.log("ReMix: Sending IDs to backend:", ids);

            if (ids.length === 0) {
                alert("No valid Sales Orders selected");
                setLoading(false);
                return;
            }

            const res = await recalculateOrtecAction(ids)

            if (res.success) {
                setOpen(false)
                onSuccess()
            } else {
                alert("Failed: " + res.error)
            }
        } catch (e) {
            console.error(e)
            alert("Error executing Re-Mix")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="secondary" size="sm" className="ml-2 h-8 border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100">
                    <RefreshCw className="mr-2 h-3 w-3" />
                    Recalculate (Re-Mix)
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Calculator className="h-5 w-5 text-blue-600" />
                        Recalculate ORTEC (Re-Mix)
                    </DialogTitle>
                    <DialogDescription>
                        Create a new planning iteration for the selected orders.
                        This will generate a <strong>NEW TPA Number</strong>.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center bg-slate-50 p-3 rounded border">
                            <span className="text-sm font-medium">Selected Orders</span>
                            <Badge variant="default">{validOrders.length}</Badge>
                        </div>

                        {invalidCount > 0 && (
                            <div className="text-xs text-red-500 bg-red-50 p-2 rounded">
                                {invalidCount} orders excluded (Not Calculated / No TPA).
                            </div>
                        )}

                        <div className="space-y-2">
                            <span className="text-xs text-muted-foreground uppercase font-bold">Projected Context</span>

                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="flex flex-col border p-2 rounded">
                                    <span className="text-xs text-muted-foreground">Original Groups</span>
                                    <span className="font-mono font-bold text-xs mt-1 truncate" title={distinctTpas.join(', ')}>
                                        {distinctTpas.length > 0 ? `${distinctTpas.length}` : 'None'}
                                    </span>
                                </div>
                                <div className="flex flex-col border p-2 rounded">
                                    <span className="text-xs text-muted-foreground">Est. Total LDM</span>
                                    <span className="font-bold mt-1 text-blue-600">{estimatedLdm.toFixed(2)}</span>
                                </div>
                                <div className="flex flex-col border p-2 rounded col-span-2">
                                    <span className="text-xs text-muted-foreground">Effective Shipment Type</span>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Badge variant={effectiveType === 'DIRECT' ? 'default' : 'outline'}>
                                            {effectiveType}
                                        </Badge>
                                        {effectiveType === 'DIRECT' && !isDirect && (
                                            <span className="text-[10px] text-amber-600 font-bold">(Escalated &gt; 3 LDM)</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="text-xs text-muted-foreground italic">
                            * Original TPA associations/Types preserved in history.
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleConfirm} disabled={loading || validOrders.length === 0}>
                        {loading ? "Calculating..." : "Confirm Re-Mix"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
