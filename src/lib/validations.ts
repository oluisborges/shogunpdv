import { z } from "zod";

export const createTenantSchema = z.object({
  name: z.string().min(2, "Nome muito curto"),
  slug: z
    .string()
    .min(2)
    .max(32)
    .regex(/^[a-z0-9-]+$/, "Apenas letras minúsculas, números e hífens"),
  phone: z.string().optional(),
  address: z.string().optional(),
  description: z.string().optional(),
});

export const createProductSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  description: z.string().optional(),
  basePrice: z.number().min(0),
  categoryId: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  variants: z
    .array(
      z.object({
        name: z.string().min(1),
        groupName: z.string().min(1),
        price: z.number().default(0),
      })
    )
    .optional(),
  trackStock: z.boolean().default(true),
  initialStock: z.number().int().min(0).default(0),
});

export const createOrderSchema = z.object({
  tenantSlug: z.string(),
  channel: z.enum(["STOREFRONT", "COUNTER", "WHATSAPP", "EXTERNAL"]),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerAddress: z.string().optional(),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        variantId: z.string().optional(),
        quantity: z.number().int().min(1),
        unitPrice: z.number().min(0),
        notes: z.string().optional(),
      })
    )
    .min(1, "Pedido deve ter pelo menos 1 item"),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "READY", "DELIVERED", "CANCELLED"]),
});

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Nome muito curto"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  tenantName: z.string().min(2, "Nome da marmitaria muito curto"),
  tenantSlug: z
    .string()
    .min(2)
    .max(32)
    .regex(/^[a-z0-9-]+$/, "Apenas letras minúsculas, números e hífens"),
});

export const adjustStockSchema = z.object({
  productId: z.string(),
  quantity: z.number().int(),
  type: z.enum(["IN", "ADJUST"]),
  reason: z.string().optional(),
});
