import { KpiCards, KpiStats } from "@/components/kpi-cards";
import { DataTable } from "@/components/data-table";
import { columns } from "@/components/columns";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardActions } from "@/components/dashboard-actions";
import { SalesOrderStatus, ShippingType } from "@prisma/client";
import { fetchSalesOrders, fetchKPIs } from "./actions-data";
import DashboardClient from "./dashboard-client";

export const dynamic = 'force-dynamic';

async function getOrders() {
  try {
    const rawOrders = await prisma.salesOrder.findMany({
      orderBy: { createdAt: 'desc' },
      // Fetching all to aggregate. Optimisation: Use prisma.aggregate in separate calls if vol is high.
    });

    // CORRECCIÓN: Convertir Decimales a Números
    return rawOrders.map(order => ({
      ...order,
      weight: Number(order.weight),
      volumeM3: Number(order.volumeM3),
      loadingMeters: order.loadingMeters !== null ? Number(order.loadingMeters) : null,
      height: Number(order.height),
    }));

  } catch (e) {
    console.error("Failed to fetch orders", e);
    return [];
  }
}

function calculateStats(orders: any[]): KpiStats {
  const stats: KpiStats = {
    direct: { orders: 0, pallets: 0, pieces: 0 },
    groupage: { orders: 0, pallets: 0, pieces: 0 },
    parcels: { orders: 0, pieces: 0 },
    blocked: { orders: 0 },
    openWorkload: { orders: 0 },
    capacity: { remaining: 10000, total: 10000 }
  };

  let totalCartons = 0;

  orders.forEach(o => {
    const isDirect = o.shippingType === ShippingType.DIRECT_LTL || o.shippingType === ShippingType.DIRECT_FTL;
    const isGroupage = o.shippingType === ShippingType.GROUPAGE;
    const isParcel = o.shippingType === ShippingType.PARCEL;
    const isBlocked = o.status === SalesOrderStatus.ON_HOLD;
    const isOpen = o.status === SalesOrderStatus.OPEN;

    // Aggregates for Tiles (Usually based on Open/OnHold/Planned working set, here assuming all fetched are relevant)
    // Let's filter slightly: usually KPIs reflect the "Active" workload
    if (o.status === SalesOrderStatus.CANCELLED || o.status === SalesOrderStatus.RECEIVED) return;

    if (isDirect) {
      stats.direct.orders++;
      stats.direct.pallets += o.pallets;
      stats.direct.pieces += o.cartonQuantity;
    }
    if (isGroupage) {
      stats.groupage.orders++;
      stats.groupage.pallets += o.pallets;
      stats.groupage.pieces += o.cartonQuantity;
    }
    if (isParcel) {
      stats.parcels.orders++;
      stats.parcels.pieces += o.cartonQuantity;
    }
    if (isBlocked) {
      stats.blocked.orders++;
    }
    if (isOpen) {
      stats.openWorkload.orders++;
    }

    // Capacity Usage (Only count when in P.Calc status)
    if (o.status === SalesOrderStatus.PALLET_CALC_REQUESTED) {
      totalCartons += o.cartonQuantity;
    }
  });

  stats.capacity.remaining = Math.max(0, 10000 - totalCartons);

  return stats;
}

export default async function DashboardPage() {
  // Initial Fetch on Server
  const start = Date.now();
  const orders = await fetchSalesOrders();
  const kpis = await fetchKPIs();
  console.log(`Initial Load: ${Date.now() - start}ms`);

  return <DashboardClient initialOrders={orders} initialKPIs={kpis} />
}