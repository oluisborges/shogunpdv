import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentTenant, getNextOrderNumber } from "@/lib/tenant";
import { createOrderSchema } from "@/lib/validations";
import { notifyTenant } from "@/app/api/sse/route";

// GET /api/orders — listar pedidos do tenant
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant = await getCurrentTenant();
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const date = searchParams.get("date");

  const where: Record<string, unknown> = { tenantId: tenant.id };
  if (status) where.status = status;
  if (date) {
    const start = new Date(`${date}T00:00:00`);
    const end = new Date(`${date}T23:59:59`);
    where.createdAt = { gte: start, lte: end };
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      items: {
        include: {
          product: { select: { name: true } },
          variant: { select: { name: true, groupName: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(orders);
}

// POST /api/orders — criar pedido (storefront ou balcão)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = createOrderSchema.parse(body);

    const tenant = await prisma.tenant.findUnique({
      where: { slug: data.tenantSlug },
    });
    if (!tenant) {
      return NextResponse.json({ error: "Marmitaria não encontrada" }, { status: 404 });
    }

    let createdById: string | undefined;
    if (data.channel === "COUNTER") {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      createdById = session.user.id;
    }

    let totalAmount = 0;
    for (const item of data.items) {
      totalAmount += item.unitPrice * item.quantity;
    }

    const orderNumber = await getNextOrderNumber(tenant.id);

    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          number: orderNumber,
          tenantId: tenant.id,
          channel: data.channel,
          status: "PENDING",
          totalAmount,
          notes: data.notes,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          customerAddress: data.customerAddress,
          createdById,
          items: {
            create: data.items.map((item) => ({
              productId: item.productId,
              variantId: item.variantId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              notes: item.notes,
            })),
          },
        },
        include: {
          items: {
            include: {
              product: { select: { name: true } },
              variant: { select: { name: true, groupName: true } },
            },
          },
        },
      });
      return newOrder;
    });

    notifyTenant(tenant.id, { type: "NEW_ORDER", order });

    return NextResponse.json(order, { status: 201 });
  } catch (error: unknown) {
    console.error("Create order error:", error);
    return NextResponse.json({ error: "Erro ao criar pedido" }, { status: 500 });
  }
}
