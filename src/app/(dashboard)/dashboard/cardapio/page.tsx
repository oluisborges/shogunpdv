import { getCurrentTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { MenuManager } from "@/components/dashboard/MenuManager";

export const dynamic = "force-dynamic";

export default async function CardapioPage() {
  const tenant = await getCurrentTenant();
  if (!tenant) return null;

  const categories = await prisma.category.findMany({
    where: { tenantId: tenant.id },
    orderBy: { position: "asc" },
  });

  const products = await prisma.product.findMany({
    where: { tenantId: tenant.id },
    include: {
      variants: true,
      category: true,
      inventory: true,
    },
    orderBy: [{ position: "asc" }],
  });

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Cardápio</h1>
      <MenuManager
        initialCategories={categories}
        initialProducts={products}
        tenantSlug={tenant.slug}
      />
    </div>
  );
}
