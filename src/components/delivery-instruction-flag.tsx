"use client"

import { useState } from "react"
import { Flag } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"

interface DeliveryInstructionFlagProps {
    instruction: string
}

export function DeliveryInstructionFlag({ instruction }: DeliveryInstructionFlagProps) {
    const [open, setOpen] = useState(false)

    return (
        <>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            onClick={() => setOpen(true)}
                            className="inline-flex items-center justify-center hover:opacity-80 transition-opacity"
                            aria-label="View delivery instructions"
                        >
                            <Flag className="h-4 w-4 text-red-600 fill-red-600" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Delivery instructions available</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Delivery Instructions</DialogTitle>
                        <DialogDescription>
                            Special instructions for this delivery
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-gray-700">{instruction}</p>
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={() => setOpen(false)}>Close</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
