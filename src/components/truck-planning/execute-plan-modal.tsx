"use client"

import { useState, useEffect } from "react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { executePlanAction } from "@/app/planning/actions"
import { Loader2, Play } from "lucide-react"
import { LoadType } from "@prisma/client"

interface ExecutePlanModalProps {
    truckId: string
    truckNumber: string
}

// MVP Hardcoded Carriers
const CARRIERS = [
    { code: "KLG", name: "KLG Europe" },
    { code: "DSV", name: "DSV Road" },
    { code: "DHL", name: "DHL Freight" },
    { code: "UPS", name: "UPS SCS" },
]

export function ExecutePlanModal({ truckId, truckNumber }: ExecutePlanModalProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    // Form State
    const [carrier, setCarrier] = useState<string>("")
    const [date, setDate] = useState<string>("")
    const [time, setTime] = useState<string>("08:00") // Default 08:00
    const [loadType, setLoadType] = useState<LoadType>("DIRECT")

    // Preview State
    const [previewRef, setPreviewRef] = useState<string>("...")

    // Update Preview
    useEffect(() => {
        if (carrier && date && loadType) {
            // Mock logic to show user what it looks like
            // KLG19122026DXX
            try {
                const d = new Date(date)
                const day = String(d.getDate()).padStart(2, '0')
                const month = String(d.getMonth() + 1).padStart(2, '0')
                const year = d.getFullYear()
                let typeChar = 'D'
                if (loadType === 'PRELOAD') typeChar = 'P'
                if (loadType === 'COMBI') typeChar = 'C'
                if (loadType === 'LZV') typeChar = 'L'

                setPreviewRef(`${carrier}${day}${month}${year}${typeChar}XX`)
            } catch (e) {
                setPreviewRef("Invalid Date")
            }
        } else {
            setPreviewRef("Select all fields to see ref...")
        }
    }, [carrier, date, loadType])


    const handleExecute = async () => {
        setLoading(true)
        try {
            await executePlanAction(truckId, "", carrier, date, time, loadType)
            setOpen(false)
        } catch (error) {
            console.error("Execution failed", error)
        } finally {
            setLoading(false)
        }
    }

    const isValid = () => {
        return carrier && date && time && loadType
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="bg-green-600 hover:bg-green-700">
                    <Play className="mr-2 h-3 w-3" />
                    Execute / Plan
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Execute Truck Plan</DialogTitle>
                    <DialogDescription>
                        Plan logistics for {truckNumber}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">

                    {/* Carrier */}
                    <div className="grid gap-2">
                        <Label htmlFor="carrier">Carrier</Label>
                        <Select onValueChange={setCarrier} value={carrier}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Carrier" />
                            </SelectTrigger>
                            <SelectContent>
                                {CARRIERS.map(c => (
                                    <SelectItem key={c.code} value={c.code}>{c.name} ({c.code})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Date */}
                        <div className="grid gap-2">
                            <Label htmlFor="date">Pickup Date</Label>
                            <Input
                                type="date"
                                id="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                            />
                        </div>

                        {/* Time */}
                        <div className="grid gap-2">
                            <Label htmlFor="time">Pickup Time</Label>
                            <Input
                                type="time"
                                id="time"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Load Type */}
                    {/* Load Type */}
                    <div className="grid gap-2">
                        <Label>Load Type</Label>
                        <RadioGroup value={loadType} onValueChange={(v) => setLoadType(v as LoadType)} className="flex gap-4">
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="DIRECT" id="direct" />
                                <Label htmlFor="direct">Direct</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="PRELOAD" id="preload" />
                                <Label htmlFor="preload">Preload</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="COMBI" id="combi" />
                                <Label htmlFor="combi">Combi</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="LZV" id="lzv" />
                                <Label htmlFor="lzv">LZV</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    {/* Preview */}
                    <div className="bg-slate-100 p-3 rounded text-center">
                        <span className="text-xs text-muted-foreground block uppercase tracking-wide">Execution Ref Preview</span>
                        <span className="font-mono text-lg font-bold text-slate-700">{previewRef}</span>
                    </div>

                </div>

                <DialogFooter>
                    <Button disabled={loading || !isValid()} onClick={handleExecute}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm Plan
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
