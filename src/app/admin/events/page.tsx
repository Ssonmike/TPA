import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";

export const dynamic = 'force-dynamic';

export default async function AdminEventsPage() {
    const events = await prisma.eventLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100 // Limit
    });

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">System Events</h2>
            </div>

            <div className="rounded-md border">
                <table className="w-full text-sm text-left">
                    <thead className="bg-muted uppercase font-bold text-xs">
                        <tr>
                            <th className="p-3">Timestamp</th>
                            <th className="p-3">Entity</th>
                            <th className="p-3">ID</th>
                            <th className="p-3">Event</th>
                            <th className="p-3">Payload</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {events.map((e) => (
                            <tr key={e.id} className="hover:bg-muted/50">
                                <td className="p-3 font-mono text-xs text-muted-foreground">
                                    {e.createdAt.toLocaleString()}
                                </td>
                                <td className="p-3">
                                    <Badge variant="outline">{e.entityType}</Badge>
                                </td>
                                <td className="p-3 font-mono text-xs truncate max-w-[100px]" title={e.entityId}>
                                    {e.entityId}
                                </td>
                                <td className="p-3 font-bold text-blue-600">
                                    {e.eventType}
                                </td>
                                <td className="p-3 text-xs font-mono text-muted-foreground truncate max-w-[300px]" title={JSON.stringify(e.payload, null, 2)}>
                                    {JSON.stringify(e.payload)}
                                </td>
                            </tr>
                        ))}
                        {events.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-4 text-center text-muted-foreground">No events found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
