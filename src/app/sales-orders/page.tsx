import { prisma } from "@/lib/db";
import { DataTable } from "@/components/data-table";
import { columns } from "@/components/columns";

export const dynamic = 'force-dynamic';

export default async function SalesOrdersPage() {
  // 1. Buscamos los datos incluyendo la relación tpaGroup
  const rawOrders = await prisma.salesOrder.findMany({
    take: 100,
    orderBy: { createdAt: 'desc' },
    include: {
      tpaGroup: true // Incluimos la relación definida en tu schema
    }
  });

  // 2. Convertimos TODOS los Decimales a Numbers (incluyendo los del grupo)
  const orders = rawOrders.map(order => ({
    ...order,
    weight: Number(order.weight),
    volumeM3: Number(order.volumeM3),
    loadingMeters: order.loadingMeters !== null ? Number(order.loadingMeters) : null,
    height: Number(order.height),

    // Aquí procesamos el grupo si existe
    tpaGroup: order.tpaGroup ? {
      ...order.tpaGroup,
      totalWeight: Number(order.tpaGroup.totalWeight),
      totalVolumeM3: Number(order.tpaGroup.totalVolumeM3),
      totalLDM: Number(order.tpaGroup.totalLDM),
    } : null
  }));

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Sales Orders</h2>
      </div>

      <DataTable columns={columns} data={orders} />
    </div>
  );
}