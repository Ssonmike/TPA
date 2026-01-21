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

// Define locally if import fails during dev/locking, but aim for Prisma import
import { TruckType } from "@prisma/client"

interface TruckCalcModalProps {
    laneId: string
    laneName: string
    dateStr: string
    workload: {
        ldm: number
        orders: number
        groups: number
    }
}

export function TruckCalcModal({ laneId, laneName, dateStr, workload }: TruckCalcModalProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [truckType, setTruckType] = useState<TruckType>("STANDARD")
    const [customLdm, setCustomLdm] = useState<string>("")

    const handleCalculate = async () => {
        setLoading(true)
        try {
            const ldmValue = truckType === "CUSTOM" ? parseFloat(customLdm) : undefined

            await calculateTrucksAction(laneId, dateStr, truckType, ldmValue)
            setOpen(false)
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

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="secondary">
                    <Truck className="mr-2 h-3 w-3" />
                    Truck Calc
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Calculate Trucks</DialogTitle>
                    <DialogDescription>
                        Select truck type for {laneName} on {dateStr}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="bg-muted p-3 rounded-md text-sm space-y-1">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Workload:</span>
                            <span className="font-medium">{workload.ldm.toFixed(1)} LDM</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Orders / Groups:</span>
                            <span className="font-medium">{workload.orders} / {workload.groups}</span>
                        </div>
                    </div>

                    <RadioGroup value={truckType} onValueChange={(v) => setTruckType(v as TruckType)} className="grid gap-2">
                        <Label htmlFor="standard" className="flex items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary">
                            <RadioGroupItem value="STANDARD" id="standard" className="sr-only" />
                            <span>Standard</span>
                            <span className="text-muted-foreground text-sm">13.6 LDM</span>
                        </Label>

                        <Label htmlFor="combi1" className="flex items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary">
                            <RadioGroupItem value="COMBI_1" id="combi1" className="sr-only" />
                            <span>Combi 1</span>
                            <span className="text-muted-foreground text-sm">14.9 LDM</span>
                        </Label>

                        <Label htmlFor="combi2" className="flex items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary">
                            <RadioGroupItem value="COMBI_2" id="combi2" className="sr-only" />
                            <span>Combi 2</span>
                            <span className="text-muted-foreground text-sm">15.64 LDM</span>
                        </Label>

                        <Label htmlFor="lzv" className="flex items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary">
                            <RadioGroupItem value="LZV" id="lzv" className="sr-only" />
                            <span>LZV</span>
                            <span className="text-muted-foreground text-sm">21.05 LDM</span>
                        </Label>

                        <div className="space-y-2">
                            <Label htmlFor="custom" className="flex items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary">
                                <RadioGroupItem value="CUSTOM" id="custom" className="sr-only" />
                                <span>Custom</span>
                                <Badge variant="outline">User Input</Badge>
                            </Label>

                            {truckType === "CUSTOM" && (
                                <div className="ml-2 pl-4 border-l-2">
                                    <Label htmlFor="customVal" className="text-xs">Capacity (LDM)</Label>
                                    <Input
                                        id="customVal"
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
                        Calculate Trucks
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
