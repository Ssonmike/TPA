import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createCarrier, deleteCarrier } from "../actions";
import { Trash2 } from "lucide-react";

export default async function CarriersPage() {
    const carriers = await prisma.carrier.findMany();

    return (
        <div className="space-y-6 p-8">
            <h2 className="text-2xl font-bold">Carrier Management</h2>

            <div className="border p-4 rounded bg-slate-50">
                <form action={async (formData) => {
                    "use server"
                    const data = {
                        name: formData.get("name") as string,
                        code: formData.get("code") as string,
                        active: true
                    };
                    await createCarrier(data);
                }} className="flex gap-4 items-end flex-wrap">
                    <div>
                        <label className="text-xs font-bold">Code</label>
                        <Input name="code" placeholder="DHL" required className="w-24" />
                    </div>
                    <div>
                        <label className="text-xs font-bold">Name</label>
                        <Input name="name" placeholder="DHL Express" required className="w-64" />
                    </div>
                    <Button type="submit">Add Carrier</Button>
                </form>
            </div>

            <table className="w-full text-sm text-left">
                <thead className="bg-muted uppercase font-bold text-xs">
                    <tr>
                        <th className="p-2">Code</th>
                        <th className="p-2">Name</th>
                        <th className="p-2">Active</th>
                        <th className="p-2">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {carriers.map(c => (
                        <tr key={c.id} className="border-b">
                            <td className="p-2 font-bold">{c.code}</td>
                            <td className="p-2">{c.name}</td>
                            <td className="p-2">{c.active ? 'Yes' : 'No'}</td>
                            <td className="p-2">
                                <form action={async () => {
                                    "use server"
                                    await deleteCarrier(c.id);
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
