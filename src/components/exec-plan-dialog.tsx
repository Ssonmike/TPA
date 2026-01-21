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
import { Play, CheckCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface ExecPlanDialogProps {
    selectedOrders: any[]
    onConfirm: () => Promise<void>
    disabled?: boolean
}

export function ExecPlanDialog({ selectedOrders, onConfirm, disabled }: ExecPlanDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleConfirm = async () => {
        try {
            setLoading(true)
            await onConfirm()
            setOpen(false)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const totalWeight = selectedOrders.reduce((acc, o) => acc + (Number(o.weight) || 0), 0)
    const totalLdm = selectedOrders.reduce((acc, o) => acc + (Number(o.loadingMeters || o.ldmAllocated) || 0), 0)

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                    disabled={disabled}
                >
                    <Play className="mr-2 h-4 w-4" fill="currentColor" />
                    Exec / Plan
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-purple-600" />
                        Execute Planning
                    </DialogTitle>
                    <DialogDescription>
                        Confirm execution for the selected accepted orders.
                        This will finalize their status to <strong>PLANNED</strong>.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="flex justify-between items-center bg-slate-50 p-3 rounded border">
                        <span className="text-sm font-medium">Orders to Plan</span>
                        <Badge variant="default" className="bg-purple-600">{selectedOrders.length}</Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex flex-col border p-2 rounded">
                            <span className="text-xs text-muted-foreground">Total Weight</span>
                            <span className="font-bold mt-1">{Math.round(totalWeight)} kg</span>
                        </div>
                        <div className="flex flex-col border p-2 rounded">
                            <span className="text-xs text-muted-foreground">Total LDM</span>
                            <span className="font-bold mt-1">{totalLdm.toFixed(1)}</span>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={loading}
                        className="bg-purple-600 hover:bg-purple-700"
                    >
                        {loading ? "Executing..." : "Confirm Execution"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
