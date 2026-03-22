import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/tenant";
import { updateOrderStatusSchema } from "@/lib/validations";
import { notifyTenant } from "@/app/api/sse/route";

// PATCH /api/orders/[id] — atualizar status do pedido
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant = await getCurrentTenant();
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const { id } = await params;
  const body = await req.json();
  const { status } = updateOrderStatusSchema.parse(body);

  const order = await prisma.order.findFirst({
    where: { id, tenantId: tenant.id },
  });
  if (!order) {
    return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updatedOrder = await tx.order.update({
      where: { id },
      data: { status },
      include: {
        items: {
          include: {
            product: { select: { name: true } },
            variant: { select: { name: true, groupName: true } },
          },
        },
      },
    });

    // Decrementar estoque ao confirmar pedido
    if (status === "CONFIRMED" && order.status === "PENDING") {
      const items = await tx.orderItem.findMany({ where: { orderId: id } });

      for (const item of items) {
        const inventory = await tx.inventoryItem.findUnique({
          where: { productId: item.productId },
        });

        if (inventory?.trackStock) {
          await tx.inventoryItem.update({
            where: { id: inventory.id },
            data: { quantity: { decrement: item.quantity } },
          });

          await tx.stockMovement.create({
            data: {
              inventoryItemId: inventory.id,
              orderId: id,
              type: "OUT",
              quantity: item.quantity,
              reason: `Pedido #${updatedOrder.number}`,
            },
          });
        }
      }
    }

    return updatedOrder;
  });

  notifyTenant(tenant.id, { type: "ORDER_UPDATED", order: updated });

  return NextResponse.json(updated);
}
