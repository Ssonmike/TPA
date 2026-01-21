import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveThresholdRule } from "../actions";

export default async function ThresholdRulePage() {
    const rule = await prisma.thresholdRule.findFirst();

    // Default values if no rule exists yet
    const defaults = {
        minVolumeFTL: 70,
        minVolumeDirect: 15.6,
        maxVolumeGroupage: 15.6
    };

    // Merge
    const val = rule ? { ...rule, minVolumeFTL: Number(rule.minVolumeFTL), minVolumeDirect: Number(rule.minVolumeDirect) } : defaults;

    return (
        <div className="space-y-6 p-8">
            <h2 className="text-2xl font-bold">Global Threshold Rules</h2>
            <p className="text-muted-foreground text-sm">Define the global volume limits for classification logic.</p>

            <form action={async (formData) => {
                "use server"
                const data = {
                    minVolumeFTL: Number(formData.get("minVolumeFTL")),
                    minVolumeDirect: Number(formData.get("minVolumeDirect")),
                    maxVolumeGroupage: Number(formData.get("maxVolumeGroupage")),
                };
                await saveThresholdRule(data);
            }} className="border p-6 rounded-md max-w-lg space-y-4">

                <div className="grid grid-cols-2 gap-4 items-center">
                    <label className="font-semibold text-sm">Min Volume for FTL</label>
                    <Input name="minVolumeFTL" type="number" step="0.1" defaultValue={val.minVolumeFTL} />
                </div>

                <div className="grid grid-cols-2 gap-4 items-center">
                    <label className="font-semibold text-sm">Min Volume for Direct</label>
                    <Input name="minVolumeDirect" type="number" step="0.1" defaultValue={val.minVolumeDirect} />
                </div>

                <div className="grid grid-cols-2 gap-4 items-center">
                    <label className="font-semibold text-sm">Max Volume Groupage</label>
                    <Input name="maxVolumeGroupage" type="number" step="0.1" defaultValue={Number(val.maxVolumeGroupage || 15.6)} />
                </div>

                <Button type="submit" className="w-full">Save Changes</Button>
            </form>
        </div>
    )
}
