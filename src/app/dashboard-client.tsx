"use client"

import { useQuery } from "@tanstack/react-query"
import { fetchSalesOrders, fetchKPIs } from "./actions-data"
import { DataTable } from "@/components/data-table"
import { columns } from "@/components/columns"
import { KpiCards } from "@/components/kpi-cards"
import { DashboardActions } from "@/components/dashboard-actions"

export default function DashboardClient({ initialOrders, initialKPIs }: { initialOrders: any[], initialKPIs: any }) {

    const { data: orders } = useQuery({
        queryKey: ['orders'],
        queryFn: () => fetchSalesOrders(),
        initialData: initialOrders,
        refetchInterval: 10000
    });

    const { data: kpis } = useQuery({
        queryKey: ['kpis'],
        queryFn: () => fetchKPIs(),
        initialData: initialKPIs,
        refetchInterval: 10000
    });

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                <DashboardActions />
            </div>

            <KpiCards stats={kpis} />

            <DataTable columns={columns} data={orders} defaultExpanded={true} />
        </div>
    )
}
