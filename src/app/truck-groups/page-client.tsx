"use client"

import { useQuery } from "@tanstack/react-query"
import { fetchTruckGroups } from "../actions-data"
import { DataTable } from "@/components/data-table"
import { truckColumns } from "./columns" // Verify path

export default function TruckGroupsClient({ initialData }: { initialData: any[] }) {
    const { data } = useQuery({
        queryKey: ['trucks'],
        queryFn: () => fetchTruckGroups(),
        initialData,
        refetchInterval: 10000
    });

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Truck Groups</h2>
            </div>
            <DataTable columns={truckColumns} data={data} />
        </div>
    )
}
