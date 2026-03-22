import { getCurrentTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { InventoryManager } from "@/components/dashboard/InventoryManager";

export const dynamic = "force-dynamic";

export default async function EstoquePage() {
  const tenant = await getCurrentTenant();
  if (!tenant) return null;

  const inventory = await prisma.inventoryItem.findMany({
    where: { tenantId: tenant.id },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          active: true,
          category: { select: { name: true } },
        },
      },
      stockMovements: {
        orderBy: { createdAt: "desc" },
        take: 3,
      },
    },
    orderBy: { product: { name: "asc" } },
  });

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Controle de Estoque</h1>
      <InventoryManager initialInventory={inventory} />
    </div>
  );
}
