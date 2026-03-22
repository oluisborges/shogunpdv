import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Retorna o tenant ativo para o usuário autenticado.
 * Usa o primeiro tenant do usuário (pode ser expandido para multi-tenant switching).
 */
export async function getCurrentTenant() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const userTenant = await prisma.userTenant.findFirst({
    where: { userId: session.user.id },
    include: { tenant: true },
  });

  return userTenant?.tenant ?? null;
}

/**
 * Retorna o tenant e o role do usuário naquele tenant.
 */
export async function getCurrentTenantWithRole() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const userTenant = await prisma.userTenant.findFirst({
    where: { userId: session.user.id },
    include: { tenant: true },
  });

  if (!userTenant) return null;

  return {
    tenant: userTenant.tenant,
    role: userTenant.role,
  };
}

/**
 * Gera o próximo número de pedido para o tenant.
 */
export async function getNextOrderNumber(tenantId: string): Promise<number> {
  const last = await prisma.order.findFirst({
    where: { tenantId },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  return (last?.number ?? 0) + 1;
}

/**
 * Formata valor em BRL.
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}
