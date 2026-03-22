import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentTenant } from "@/lib/tenant";
import { adjustStockSchema } from "@/lib/validations";

// GET /api/inventory — estoque do tenant
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant = await getCurrentTenant();
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const inventory = await prisma.inventoryItem.findMany({
    where: { tenantId: tenant.id },
    include: {
      product: {
        select: { id: true, name: true, active: true, category: { select: { name: true } } },
      },
      stockMovements: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
    orderBy: { product: { name: "asc" } },
  });

  return NextResponse.json(inventory);
}

// POST /api/inventory — ajustar estoque manualmente
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant = await getCurrentTenant();
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const body = await req.json();
  const data = adjustStockSchema.parse(body);

  const inventory = await prisma.inventoryItem.findFirst({
    where: { productId: data.productId, tenantId: tenant.id },
  });
  if (!inventory) {
    return NextResponse.json({ error: "Produto não encontrado no estoque" }, { status: 404 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const newQty =
      data.type === "IN"
        ? inventory.quantity + data.quantity
        : data.quantity; // ADJUST define diretamente

    const inv = await tx.inventoryItem.update({
      where: { id: inventory.id },
      data: { quantity: newQty },
    });

    await tx.stockMovement.create({
      data: {
        inventoryItemId: inventory.id,
        type: data.type,
        quantity: data.quantity,
        reason: data.reason,
      },
    });

    return inv;
  });

  return NextResponse.json(updated);
}
