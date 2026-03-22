import { getCurrentTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { CounterPOS } from "@/components/dashboard/CounterPOS";

export const dynamic = "force-dynamic";

export default async function BalcaoPage() {
  const tenant = await getCurrentTenant();
  if (!tenant) return null;

  const categories = await prisma.category.findMany({
    where: { tenantId: tenant.id, active: true },
    orderBy: { position: "asc" },
  });

  const products = await prisma.product.findMany({
    where: { tenantId: tenant.id, active: true },
    include: {
      variants: { where: { active: true } },
      inventory: true,
      category: true,
    },
    orderBy: [{ position: "asc" }],
  });

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">Balcão</h1>
      <CounterPOS
        categories={categories}
        products={products}
        tenantSlug={tenant.slug}
      />
    </div>
  );
}
