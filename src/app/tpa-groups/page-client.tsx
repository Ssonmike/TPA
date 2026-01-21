"use client"

import { useQuery } from "@tanstack/react-query"
import { fetchTPAGroups } from "../actions-data"
import { DataTable } from "@/components/data-table"
import { groupColumns } from "./columns"

export default function TPAGroupsClient({ initialData }: { initialData: any[] }) {
    const { data } = useQuery({
        queryKey: ['tpa-groups'],
        queryFn: () => fetchTPAGroups(),
        initialData,
        refetchInterval: 10000
    });

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">TPA Groups</h2>
            </div>

            <DataTable columns={groupColumns} data={data} />
        </div>
    )
}
