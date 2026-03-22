import { getCurrentTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { OrdersDashboard } from "@/components/dashboard/OrdersDashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const tenant = await getCurrentTenant();
  if (!tenant) return null;

  // Pedidos de hoje
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const orders = await prisma.order.findMany({
    where: {
      tenantId: tenant.id,
      createdAt: { gte: today, lt: tomorrow },
      status: { not: "DELIVERED" },
    },
    include: {
      items: {
        include: {
          product: { select: { name: true } },
          variant: { select: { name: true, groupName: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Pedidos de hoje</h1>
        <span className="text-sm text-gray-500">
          {orders.length} pedido{orders.length !== 1 ? "s" : ""}
        </span>
      </div>
      <OrdersDashboard initialOrders={orders} tenantId={tenant.id} />
    </div>
  );
}
