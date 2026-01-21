import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createDirectRule, deleteDirectRule } from "../actions";
import { Trash2 } from "lucide-react";

export default async function DirectRulesPage() {
    const rules = await prisma.directShipToRule.findMany();

    return (
        <div className="space-y-6 p-8">
            <h2 className="text-2xl font-bold">Direct ShipTo Rules</h2>

            <div className="border p-4 rounded bg-slate-50">
                <form action={async (formData) => {
                    "use server"
                    const data = {
                        customerId: formData.get("customerId") as string,
                        shipToId: formData.get("shipToId") as string,
                        country: formData.get("country") as string,
                        forceDirect: formData.get("forceDirect") === "on"
                    };
                    await createDirectRule(data);
                }} className="flex gap-4 items-end flex-wrap">
                    <div>
                        <label className="text-xs font-bold">Customer ID</label>
                        <Input name="customerId" placeholder="CUST01" required className="w-32" />
                    </div>
                    <div>
                        <label className="text-xs font-bold">ShipTo ID</label>
                        <Input name="shipToId" placeholder="SHIP01" required className="w-32" />
                    </div>
                    <div>
                        <label className="text-xs font-bold">Country</label>
                        <Input name="country" placeholder="DE" required className="w-20" />
                    </div>
                    <div className="pb-2">
                        <label className="flex items-center gap-2 text-xs font-bold">
                            <input type="checkbox" name="forceDirect" defaultChecked /> Force Direct
                        </label>
                    </div>
                    <Button type="submit">Add Rule</Button>
                </form>
            </div>

            <table className="w-full text-sm text-left">
                <thead className="bg-muted uppercase font-bold text-xs">
                    <tr>
                        <th className="p-2">Customer</th>
                        <th className="p-2">Ship To</th>
                        <th className="p-2">Country</th>
                        <th className="p-2">Force Direct</th>
                        <th className="p-2">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {rules.map(r => (
                        <tr key={r.id} className="border-b">
                            <td className="p-2">{r.customerId}</td>
                            <td className="p-2 font-bold">{r.shipToId}</td>
                            <td className="p-2">{r.country}</td>
                            <td className="p-2">{r.forceDirect ? 'Yes' : 'No'}</td>
                            <td className="p-2">
                                <form action={async () => {
                                    "use server"
                                    await deleteDirectRule(r.id);
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
