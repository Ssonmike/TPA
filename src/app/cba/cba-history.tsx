
"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, History } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { fetchEventLogsAction } from "./actions"
import { format } from "date-fns"

interface HistorySheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    orderIds: string[]
    tpaNumber?: string
}

export function HistorySheet({ open, onOpenChange, orderIds, tpaNumber }: HistorySheetProps) {
    const [logs, setLogs] = useState<any[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (open && orderIds.length > 0) {
            setLoading(true)
            fetchEventLogsAction(orderIds)
                .then(res => {
                    if (res.success) setLogs(res.data)
                })
                .finally(() => setLoading(false))
        }
    }, [open, orderIds])

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-[400px] sm:w-[540px]">
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                        <History className="h-5 w-5" />
                        History & Audit
                    </SheetTitle>
                    <SheetDescription>
                        Timeline of events for {tpaNumber ? `TPA ${tpaNumber}` : `${orderIds.length} Orders`}
                    </SheetDescription>
                </SheetHeader>

                <ScrollArea className="h-[calc(100vh-100px)] mt-6 pr-4">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center text-sm text-gray-500 py-8">
                            No history recorded.
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {logs.map((log) => (
                                <div key={log.id} className="relative pl-6 border-l-2 border-gray-100 pb-2">
                                    <div className="absolute -left-[5px] top-0 h-2.5 w-2.5 rounded-full bg-blue-400 ring-4 ring-white" />

                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-gray-500">
                                                {format(new Date(log.createdAt), "dd/MM/yyyy HH:mm")}
                                            </span>
                                            <Badge variant="outline" className="text-[10px] py-0 h-5">
                                                {log.actor}
                                            </Badge>
                                        </div>

                                        <div className="text-sm font-medium text-gray-900">
                                            {log.eventType}
                                        </div>

                                        {log.payload && (log.payload as any).message && (
                                            <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded-md mt-1">
                                                {(log.payload as any).message}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </SheetContent>
        </Sheet>
    )
}
