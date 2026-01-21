"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { assignCarrierAction } from "@/app/direct/actions"
import { Loader2, Truck } from "lucide-react"
import { useRouter } from "next/navigation"

interface CarrierAssignmentModalProps {
    selectedOrderIds: string[];
    onSuccess?: () => void;
}

export function CarrierAssignmentModal({ selectedOrderIds, onSuccess }: CarrierAssignmentModalProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [carrier, setCarrier] = useState<string>("");

    // Default Date Logic: Tomorrow, or Monday if weekend
    const getDefaultDate = () => {
        const date = new Date();
        date.setDate(date.getDate() + 1); // Tomorrow

        // 0 = Sunday, 6 = Saturday
        if (date.getDay() === 6) { // Saturday -> Skip to Monday (+2)
            date.setDate(date.getDate() + 2);
        } else if (date.getDay() === 0) { // Sunday -> Skip to Monday (+1)
            date.setDate(date.getDate() + 1);
        }
        return date.toISOString().split('T')[0];
    };

    const [pickupDate, setPickupDate] = useState<string>(getDefaultDate());
    const router = useRouter();

    // Reset state when opening
    const handleOpenChange = (isOpen: boolean) => {
        setOpen(isOpen);
        if (isOpen) {
            setPickupDate(getDefaultDate());
            setCarrier("");
        }
    }

    const handleConfirm = async () => {
        if (!carrier || !pickupDate) return;

        setLoading(true);
        // Ensure date is treated correctly (noon UTC to avoid partial day shifts)
        const dateObj = new Date(pickupDate);

        const result = await assignCarrierAction(selectedOrderIds, carrier, dateObj);

        setLoading(false);
        if (result.success) {
            setOpen(false);
            if (onSuccess) onSuccess();
            router.refresh();
        } else {
            // Handle error (could add toast here)
            alert(result.message);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button
                    variant="default"
                    size="sm"
                    disabled={selectedOrderIds.length === 0}
                    className="ml-auto bg-blue-600 hover:bg-blue-700 text-white"
                >
                    <Truck className="mr-2 h-4 w-4" />
                    Carrier Assignment ({selectedOrderIds.length})
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Assign Carrier</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="carrier">Carrier</Label>
                        <Select onValueChange={setCarrier} value={carrier}>
                            <SelectTrigger id="carrier">
                                <SelectValue placeholder="Select carrier" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="DSV">DSV</SelectItem>
                                <SelectItem value="DHL">DHL</SelectItem>
                                <SelectItem value="KLG">KLG</SelectItem>
                                <SelectItem value="UPS">UPS</SelectItem>
                                <SelectItem value="RABEN">RABEN</SelectItem>
                                <SelectItem value="CT">CT</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="pickup">Earliest Pickup Date</Label>
                        <Input
                            id="pickup"
                            type="date"
                            value={pickupDate}
                            onChange={(e) => setPickupDate(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={loading || !carrier || !pickupDate}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Request
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
