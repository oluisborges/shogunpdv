import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/tenant";
import { createProductSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");

  let tenantId: string;

  if (slug) {
    const tenant = await prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });
    tenantId = tenant.id;
  } else {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tenant = await getCurrentTenant();
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    tenantId = tenant.id;
  }

  const products = await prisma.product.findMany({
    where: { tenantId, active: true },
    include: {
      category: true,
      variants: { where: { active: true } },
      inventory: true,
    },
    orderBy: [{ position: "asc" }],
  });

  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant = await getCurrentTenant();
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const body = await req.json();
  const data = createProductSchema.parse(body);

  const product = await prisma.$transaction(async (tx) => {
    const p = await tx.product.create({
      data: {
        tenantId: tenant.id,
        name: data.name,
        description: data.description,
        basePrice: data.basePrice,
        categoryId: data.categoryId || null,
        imageUrl: data.imageUrl || null,
        variants: data.variants
          ? {
              create: data.variants.map((v) => ({
                name: v.name,
                groupName: v.groupName,
                price: v.price,
              })),
            }
          : undefined,
      },
      include: { variants: true, inventory: true, category: true },
    });

    await tx.inventoryItem.create({
      data: {
        productId: p.id,
        tenantId: tenant.id,
        quantity: data.initialStock ?? 0,
        trackStock: data.trackStock ?? true,
      },
    });

    return p;
  });

  return NextResponse.json(product, { status: 201 });
}
