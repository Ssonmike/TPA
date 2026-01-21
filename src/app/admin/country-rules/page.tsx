import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createCountryRule, deleteCountryRule } from "../actions";
import { Trash2 } from "lucide-react";

export default async function CountryRulesPage() {
    const rules = await prisma.countryRule.findMany();

    return (
        <div className="space-y-6 p-8">
            <h2 className="text-2xl font-bold">Country Rules</h2>

            {/* Simple Create Form */}
            <div className="border p-4 rounded bg-slate-50">
                <form action={async (formData) => {
                    "use server"
                    const data = {
                        country: formData.get("country") as string,
                        restrictionCode: formData.get("restrictionCode") as string,
                        maxHeight: formData.get("maxHeight") ? Number(formData.get("maxHeight")) : null,
                        maxPallets: formData.get("maxPallets") ? Number(formData.get("maxPallets")) : null
                    };
                    await createCountryRule(data);
                }} className="flex gap-4 items-end flex-wrap">
                    <div>
                        <label className="text-xs font-bold">Country</label>
                        <Input name="country" placeholder="DE" required className="w-20" />
                    </div>
                    <div>
                        <label className="text-xs font-bold">Code</label>
                        <Input name="restrictionCode" placeholder="STD" required className="w-24" />
                    </div>
                    <div>
                        <label className="text-xs font-bold">Max Height</label>
                        <Input name="maxHeight" type="number" step="0.1" placeholder="2.4" className="w-24" />
                    </div>
                    <div>
                        <label className="text-xs font-bold">Max Pallets</label>
                        <Input name="maxPallets" type="number" placeholder="33" className="w-24" />
                    </div>
                    <Button type="submit">Add Rule</Button>
                </form>
            </div>

            <table className="w-full text-sm text-left">
                <thead className="bg-muted uppercase font-bold text-xs">
                    <tr>
                        <th className="p-2">Country</th>
                        <th className="p-2">Code</th>
                        <th className="p-2">Max Height</th>
                        <th className="p-2">Max Pallets</th>
                        <th className="p-2">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {rules.map(r => (
                        <tr key={r.id} className="border-b">
                            <td className="p-2 font-bold">{r.country}</td>
                            <td className="p-2">{r.restrictionCode}</td>
                            <td className="p-2">{r.maxHeight ? String(r.maxHeight) : '-'}</td>
                            <td className="p-2">{r.maxPallets || '-'}</td>
                            <td className="p-2">
                                <form action={async () => {
                                    "use server"
                                    await deleteCountryRule(r.id);
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
