"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { executeDirectPlanAction } from "@/app/direct/actions"
import { Loader2, Play } from "lucide-react"
import { useRouter } from "next/navigation"

interface ExecutePlanModalProps {
    selectedOrderIds: string[];
    onSuccess?: () => void;
}

export function ExecutePlanModal({ selectedOrderIds, onSuccess }: ExecutePlanModalProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleConfirm = async () => {
        setLoading(true);
        const result = await executeDirectPlanAction(selectedOrderIds);
        setLoading(false);
        if (result.success) {
            setOpen(false);
            if (onSuccess) onSuccess();
            router.refresh();
        } else {
            alert("Failed to execute plan");
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="default"
                    size="sm"
                    className="ml-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                    <Play className="mr-2 h-4 w-4" />
                    Exec / Plan ({selectedOrderIds.length})
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Execute Plan</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to execute {selectedOrderIds.length} orders?
                        This will move them to PLANNED status.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={loading}
                        className="bg-emerald-600 hover:bg-emerald-700"
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm Execution
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
