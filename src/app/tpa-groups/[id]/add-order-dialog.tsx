"use client"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Plus } from "lucide-react"
import { useState, useEffect } from "react"
import { addOrderToGroupAction } from "./actions"
import { Badge } from "@/components/ui/badge"

// We need to fetch candidates client side or pass them?
// Passing candidates from server to client component is easier if list is small.
// But we should fetch on open ideally. 
// For MVP, we will assume we can fetch *candidates* via a server action inside here or passed down.
// Let's create a server action to Get Candidates in `actions.ts`.

import { getCandidateOrdersAction } from "./actions-candidates"; // Separate file to avoid circular deps if any

export function AddOrderDialog({ groupId, laneId, shipDate }: { groupId: string, laneId: string, shipDate: Date }) {
    const [open, setOpen] = useState(false);
    const [candidates, setCandidates] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            setLoading(true);
            getCandidateOrdersAction(laneId, shipDate).then(res => {
                setCandidates(res);
                setLoading(false);
            })
        }
    }, [open, laneId, shipDate]);

    const handleAdd = async (orderId: string) => {
        await addOrderToGroupAction(groupId, orderId);
        setOpen(false); // Close after add
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="default">
                    <Plus className="mr-2 h-4 w-4" /> Add Order
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add Order to Group</DialogTitle>
                    <DialogDescription>
                        Select a Calculated order from the same lane and date.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-2 max-h-[300px] overflow-y-auto">
                    {loading && <div>Loading candidates...</div>}
                    {!loading && candidates.length === 0 && <div className="text-sm text-muted-foreground">No eligible orders found.</div>}
                    {candidates.map(c => (
                        <div key={c.id} className="flex items-center justify-between border p-2 rounded hover:bg-slate-50">
                            <div className="flex flex-col">
                                <span className="font-bold text-sm">{c.orderNumber}</span>
                                <span className="text-xs text-muted-foreground">{Number(c.loadingMeters).toFixed(1)} LDM</span>
                            </div>
                            <Button size="sm" variant="secondary" onClick={() => handleAdd(c.id)}>Add</Button>
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    )
}
