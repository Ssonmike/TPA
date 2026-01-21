"use client"

import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { removeOrderFromGroupAction } from "./actions"

export function RemoveOrderButton({ groupId, orderId }: { groupId: string, orderId: string }) {
    return (
        <form action={async () => {
            await removeOrderFromGroupAction(groupId, orderId);
        }}>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive">
                <Trash2 className="h-4 w-4" />
            </Button>
        </form>
    )
}
