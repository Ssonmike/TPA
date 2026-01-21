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
import { planDirectOrderAction } from "@/app/planning/direct-actions"
import { Loader2, Calendar } from "lucide-react"
import { LoadType } from "@prisma/client"

interface PlanDirectModalProps {
    orderId: string
    sapRef: string
    onSuccess?: () => void
}

const CARRIERS = [
    { code: "KLG", name: "KLG Europe" },
    { code: "DSV", name: "DSV Road" },
    { code: "DHL", name: "DHL Freight" },
    { code: "UPS", name: "UPS SCS" },
]

export function PlanDirectModal({ orderId, sapRef, onSuccess }: PlanDirectModalProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    // Form State
    const [carrier, setCarrier] = useState<string>("")
    const [date, setDate] = useState<string>("")
    const [time, setTime] = useState<string>("")
    const [loadType, setLoadType] = useState<LoadType>("DIRECT")
    const [bookingRequired, setBookingRequired] = useState<string>("false") // Radio string "true"/"false"

    // Preview State
    const [previewRef, setPreviewRef] = useState<string>("...")

    // Update Preview
    useEffect(() => {
        if (carrier && date && loadType) {
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
            setPreviewRef("Select fields for preview...")
        }
    }, [carrier, date, loadType])


    const handleExecute = async () => {
        setLoading(true)
        try {
            await planDirectOrderAction(
                orderId,
                carrier,
                date,
                time,
                loadType,
                bookingRequired === "true"
            )
            setOpen(false)
            if (onSuccess) onSuccess()
        } catch (error) {
            console.error("Direct Plan failed", error)
        } finally {
            setLoading(false)
        }
    }

    const isValid = () => {
        return carrier && date && loadType
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="default">
                    <Calendar className="mr-2 h-3 w-3" />
                    Plan Direct
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Plan Direct Order</DialogTitle>
                    <DialogDescription>
                        Arrange logistics for order {sapRef}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">

                    {/* Carrier */}
                    <div className="grid gap-2">
                        <Label>Carrier</Label>
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
                            <Label>Pickup Date</Label>
                            <Input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                            />
                        </div>

                        {/* Time */}
                        <div className="grid gap-2">
                            <Label>Pickup Time (Opt)</Label>
                            <Input
                                type="time"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Load Type */}
                        <div className="grid gap-2">
                            <Label>Load Type</Label>
                            <RadioGroup value={loadType} onValueChange={(v) => setLoadType(v as LoadType)} className="flex flex-col gap-2">
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="DIRECT" id="d" />
                                    <Label htmlFor="d">Direct</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="PRELOAD" id="p" />
                                    <Label htmlFor="p">Preload</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="COMBI" id="c" />
                                    <Label htmlFor="c">Combi</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="LZV" id="l" />
                                    <Label htmlFor="l">LZV</Label>
                                </div>
                            </RadioGroup>
                        </div>

                        {/* Booking */}
                        <div className="grid gap-2">
                            <Label>Booking Required?</Label>
                            <RadioGroup value={bookingRequired} onValueChange={setBookingRequired} className="flex flex-col gap-2">
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="true" id="by" />
                                    <Label htmlFor="by">Yes (Appt)</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="false" id="bn" />
                                    <Label htmlFor="bn">No (AVIS)</Label>
                                </div>
                            </RadioGroup>
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="bg-slate-100 p-3 rounded text-center mt-2">
                        <span className="text-xs text-muted-foreground block uppercase tracking-wide">Execution Ref Preview</span>
                        <span className="font-mono text-lg font-bold text-slate-700">{previewRef}</span>
                    </div>

                </div>

                <DialogFooter>
                    <Button disabled={loading || !isValid()} onClick={handleExecute}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
