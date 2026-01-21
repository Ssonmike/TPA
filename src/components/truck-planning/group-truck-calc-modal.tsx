"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { calculateTrucksAction } from "@/app/truck-groups/actions"
import { Loader2, Truck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { TruckType } from "@prisma/client"

interface GroupTruckCalcModalProps {
    laneId: string
    dateStr: string
    groupId: string
    groupNo: string
    selectedOrderIds: string[]
    totalSelectedLdm: number
    onSuccess?: () => void
}

export function GroupTruckCalcModal({
    laneId,
    dateStr,
    groupId,
    groupNo,
    selectedOrderIds,
    totalSelectedLdm,
    onSuccess
}: GroupTruckCalcModalProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [truckType, setTruckType] = useState<TruckType>("STANDARD")
    const [customLdm, setCustomLdm] = useState<string>("")

    const handleCalculate = async () => {
        setLoading(true)
        try {
            const ldmValue = truckType === "CUSTOM" ? parseFloat(customLdm) : undefined

            // Call action with selected orders
            await calculateTrucksAction(laneId, dateStr, truckType, ldmValue, selectedOrderIds)

            setOpen(false)
            if (onSuccess) onSuccess()
        } catch (error) {
            console.error("Calculation failed", error)
        } finally {
            setLoading(false)
        }
    }

    const isValid = () => {
        if (truckType === "CUSTOM") {
            const val = parseFloat(customLdm)
            return !isNaN(val) && val > 0
        }
        return true
    }

    const count = selectedOrderIds.length

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" disabled={count === 0}>
                    <Truck className="mr-2 h-3 w-3" />
                    Plan {count} Orders
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Plan Trucks for Group {groupNo}</DialogTitle>
                    <DialogDescription>
                        Planning {count} orders ({totalSelectedLdm.toFixed(2)} LDM) from {dateStr}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <RadioGroup value={truckType} onValueChange={(v) => setTruckType(v as TruckType)} className="grid gap-2">
                        <Label htmlFor="g-standard" className="flex items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary">
                            <RadioGroupItem value="STANDARD" id="g-standard" className="sr-only" />
                            <span>Standard</span>
                            <span className="text-muted-foreground text-sm">13.6 LDM</span>
                        </Label>

                        <Label htmlFor="g-combi1" className="flex items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary">
                            <RadioGroupItem value="COMBI_1" id="g-combi1" className="sr-only" />
                            <span>Combi 1</span>
                            <span className="text-muted-foreground text-sm">14.9 LDM</span>
                        </Label>

                        <Label htmlFor="g-lzv" className="flex items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary">
                            <RadioGroupItem value="LZV" id="g-lzv" className="sr-only" />
                            <span>LZV</span>
                            <span className="text-muted-foreground text-sm">21.05 LDM</span>
                        </Label>

                        <div className="space-y-2">
                            <Label htmlFor="g-custom" className="flex items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary">
                                <RadioGroupItem value="CUSTOM" id="g-custom" className="sr-only" />
                                <span>Custom</span>
                                <Badge variant="outline">User Input</Badge>
                            </Label>

                            {truckType === "CUSTOM" && (
                                <div className="ml-2 pl-4 border-l-2">
                                    <Label htmlFor="g-customVal" className="text-xs">Capacity (LDM)</Label>
                                    <Input
                                        id="g-customVal"
                                        type="number"
                                        step="0.1"
                                        placeholder="e.g. 5.0"
                                        value={customLdm}
                                        onChange={(e) => setCustomLdm(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>
                    </RadioGroup>
                </div>

                <DialogFooter>
                    <Button disabled={loading || !isValid()} onClick={handleCalculate}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm Plan
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
