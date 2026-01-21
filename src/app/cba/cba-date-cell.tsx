"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { CalendarIcon, Loader2, Lock } from "lucide-react"
import { updateAppointmentAction } from "./actions"
import { toast } from "sonner" // or generic

interface AppointmentDateCellProps {
    orderId: string
    bookingType: string | undefined
    dateValue: Date | undefined
    timeValue: string | undefined
    fieldName: 'actualPickup' | 'confirmedDelivery'
    isLocked?: boolean
}

export function AppointmentDateCell({
    orderId,
    bookingType,
    dateValue,
    timeValue,
    fieldName,
    isLocked
}: AppointmentDateCellProps) {
    const [date, setDate] = useState<Date | undefined>(dateValue)
    const [time, setTime] = useState(timeValue || "")
    const [loading, setLoading] = useState(false)
    const [open, setOpen] = useState(false)

    // Only for APT
    if (bookingType !== 'APT') return <span className="text-gray-300">-</span>

    const handleSave = async (newDate: Date | undefined, newTime: string) => {
        setLoading(true)
        try {
            const payload: any = {}
            if (fieldName === 'actualPickup') {
                payload.actualPickupDate = newDate
                payload.pickUpTime = newTime
            } else {
                payload.confirmedDeliveryDate = newDate
                payload.confirmedDeliveryTime = newTime
            }

            const res = await updateAppointmentAction(orderId, payload)
            if (!res.success) {
                // toast.error("Failed to update")
                console.error("Failed")
            }
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const onDateSelect = (d: Date | undefined) => {
        setDate(d)
        handleSave(d, time)
        setOpen(false)
    }

    const onTimeBlur = () => {
        if (time !== timeValue) {
            handleSave(date, time)
        }
    }

    if (isLocked) {
        return (
            <div className="flex items-center gap-1 text-xs text-gray-600">
                <Lock className="h-3 w-3 text-emerald-600" />
                <span>
                    {date ? format(date, "dd/MM/yyyy") : ""} {time}
                </span>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-1 w-[120px]">
            {/* Date Picker */}
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        size="sm"
                        disabled={loading}
                        className={cn(
                            "w-full h-7 justify-start text-left font-normal text-[10px] px-2",
                            !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-1 h-3 w-3" />
                        {date ? format(date, "dd/MM/yyyy") : <span>-</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={onDateSelect}
                        initialFocus
                    />
                </PopoverContent>
            </Popover>

            {/* Time Input */}
            <Input
                className="h-6 text-[10px] px-2"
                placeholder="HH:mm"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                onBlur={onTimeBlur}
                disabled={loading}
            />
            {loading && <Loader2 className="h-3 w-3 text-blue-500 animate-spin absolute right-0" />}
        </div>
    )
}
