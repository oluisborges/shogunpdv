import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/tenant";

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

  const product = await prisma.product.findFirst({
    where: { id, tenantId: tenant.id },
  });
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.product.update({
    where: { id },
    data: {
      name: body.name,
      description: body.description,
      basePrice: body.basePrice,
      categoryId: body.categoryId || null,
      imageUrl: body.imageUrl || null,
      active: body.active,
    },
    include: { variants: true, inventory: true, category: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant = await getCurrentTenant();
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const { id } = await params;

  const product = await prisma.product.findFirst({
    where: { id, tenantId: tenant.id },
  });
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.product.update({ where: { id }, data: { active: false } });

  return NextResponse.json({ ok: true });
}
