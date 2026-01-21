import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createCalendarEntry, deleteCalendarEntry } from "../actions";
import { Trash2 } from "lucide-react";

export default async function CalendarsPage() {
    const entries = await prisma.shippingCalendar.findMany({ orderBy: { date: 'desc' } });

    return (
        <div className="space-y-6 p-8">
            <h2 className="text-2xl font-bold">Shipping Calendar</h2>
            <p className="text-muted-foreground text-sm">Define holidays or non-shipping days.</p>

            <div className="border p-4 rounded bg-slate-50">
                <form action={async (formData) => {
                    "use server"
                    const dateStr = formData.get("date") as string;
                    const data = {
                        date: new Date(dateStr),
                        description: formData.get("description") as string,
                        isHoliday: true
                    };
                    await createCalendarEntry(data);
                }} className="flex gap-4 items-end flex-wrap">
                    <div>
                        <label className="text-xs font-bold">Date</label>
                        <Input name="date" type="date" required className="w-40" />
                    </div>
                    <div>
                        <label className="text-xs font-bold">Description</label>
                        <Input name="description" placeholder="Christmas" required className="w-64" />
                    </div>
                    <Button type="submit">Add Holiday</Button>
                </form>
            </div>

            <table className="w-full text-sm text-left">
                <thead className="bg-muted uppercase font-bold text-xs">
                    <tr>
                        <th className="p-2">Date</th>
                        <th className="p-2">Description</th>
                        <th className="p-2">Is Holiday</th>
                        <th className="p-2">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {entries.map(e => (
                        <tr key={e.id} className="border-b">
                            <td className="p-2 font-bold">{e.date.toLocaleDateString()}</td>
                            <td className="p-2">{e.description}</td>
                            <td className="p-2">{e.isHoliday ? 'Yes' : 'No'}</td>
                            <td className="p-2">
                                <form action={async () => {
                                    "use server"
                                    await deleteCalendarEntry(e.id);
                                }}>
                                    <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500"><Trash2 className="h-4 w-4" /></Button>
                                </form>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
