import { prisma } from "@/lib/db";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { ColumnDef } from "@tanstack/react-table";
import { CreateLaneDialog } from "@/components/create-lane-dialog";

// Using a inline column def for speed or reuse
type LaneRow = {
    id: string;
    name: string;
    countries: string;
    isActive: boolean;
    lanePriority: number;
}

const columns: ColumnDef<LaneRow>[] = [
    {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => <span className="font-bold">{row.getValue("name")}</span>
    },
    {
        accessorKey: "lanePriority",
        header: "Priority",
        cell: ({ row }) => <span className="font-mono">{row.getValue("lanePriority")}</span>
    },
    {
        accessorKey: "countries",
        header: "Countries",
        cell: ({ row }) => {
            const countries = (row.getValue("countries") as string).split(',');
            return (
                <div className="flex flex-wrap gap-1">
                    {countries.map(c => <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>)}
                </div>
            )
        }
    },
    {
        accessorKey: "isActive",
        header: "Active",
        cell: ({ row }) => row.getValue("isActive") ? <Badge className="bg-green-600">Yes</Badge> : <Badge variant="destructive">No</Badge>
    }
]

export const dynamic = 'force-dynamic';

export default async function AdminLanesPage() {
    const lanes = await prisma.lane.findMany({
        orderBy: { lanePriority: 'asc' }
    });

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Lanes Configuration</h2>
                <CreateLaneDialog />
            </div>

            <DataTable columns={columns} data={lanes} />
        </div>
    )
}
