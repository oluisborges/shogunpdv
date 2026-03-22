import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StorefrontClient } from "@/components/storefront/StorefrontClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: slug } = await params;
  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) return { title: "Cardápio" };
  return {
    title: `${tenant.name} — Cardápio`,
    description: tenant.description ?? `Peça online na ${tenant.name}`,
  };
}

export default async function StorefrontPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: slug } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { slug, active: true },
  });
  if (!tenant) notFound();

  const categories = await prisma.category.findMany({
    where: { tenantId: tenant.id, active: true },
    orderBy: { position: "asc" },
  });

  const products = await prisma.product.findMany({
    where: { tenantId: tenant.id, active: true },
    include: {
      variants: { where: { active: true } },
      inventory: true,
    },
    orderBy: [{ position: "asc" }],
  });

  return (
    <StorefrontClient
      tenant={tenant}
      categories={categories}
      products={products}
    />
  );
}
