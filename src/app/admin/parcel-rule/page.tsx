import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch"; // Need client logic for switch form? Use checkbox for simple form
import { createParcelRule, deleteParcelRule } from "../actions";
import { Trash2 } from "lucide-react";

export default async function ParcelRulesPage() {
    const rules = await prisma.parcelRule.findMany();

    return (
        <div className="space-y-6 p-8">
            <h2 className="text-2xl font-bold">Parcel Rules</h2>

            <div className="border p-4 rounded bg-slate-50">
                <form action={async (formData) => {
                    "use server"
                    const data = {
                        country: formData.get("country") as string,
                        allowParcel: formData.get("allowParcel") === "on",
                        maxWeight: formData.get("maxWeight") ? Number(formData.get("maxWeight")) : null,
                        maxVolumeM3: formData.get("maxVolumeM3") ? Number(formData.get("maxVolumeM3")) : null,
                    };
                    await createParcelRule(data);
                }} className="flex gap-4 items-end flex-wrap">
                    <div>
                        <label className="text-xs font-bold">Country</label>
                        <Input name="country" placeholder="DE" required className="w-20" />
                    </div>
                    <div>
                        <label className="text-xs font-bold">Max Kg</label>
                        <Input name="maxWeight" type="number" placeholder="30" className="w-24" />
                    </div>
                    <div>
                        <label className="text-xs font-bold">Max M3</label>
                        <Input name="maxVolumeM3" type="number" step="0.01" placeholder="0.2" className="w-24" />
                    </div>
                    <div className="pb-2">
                        <label className="flex items-center gap-2 text-xs font-bold">
                            <input type="checkbox" name="allowParcel" defaultChecked /> Allow
                        </label>
                    </div>
                    <Button type="submit">Add Rule</Button>
                </form>
            </div>

            <table className="w-full text-sm text-left">
                <thead className="bg-muted uppercase font-bold text-xs">
                    <tr>
                        <th className="p-2">Country</th>
                        <th className="p-2">Allowed</th>
                        <th className="p-2">Max Kg</th>
                        <th className="p-2">Max M3</th>
                        <th className="p-2">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {rules.map(r => (
                        <tr key={r.id} className="border-b">
                            <td className="p-2 font-bold">{r.country}</td>
                            <td className="p-2">{r.allowParcel ? 'Yes' : 'No'}</td>
                            <td className="p-2">{r.maxWeight ? String(r.maxWeight) : '-'}</td>
                            <td className="p-2">{r.maxVolumeM3 ? String(r.maxVolumeM3) : '-'}</td>
                            <td className="p-2">
                                <form action={async () => {
                                    "use server"
                                    await deleteParcelRule(r.id);
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
