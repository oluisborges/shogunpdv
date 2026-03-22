import type {
  Tenant,
  User,
  Product,
  ProductVariant,
  Category,
  Order,
  OrderItem,
  InventoryItem,
  OrderStatus,
  OrderChannel,
  Role,
  MovementType,
} from "@prisma/client";

export type {
  Tenant,
  User,
  Product,
  ProductVariant,
  Category,
  Order,
  OrderItem,
  InventoryItem,
  OrderStatus,
  OrderChannel,
  Role,
  MovementType,
};

// Tipos compostos usados nas páginas

export type ProductWithVariants = Product & {
  variants: ProductVariant[];
  category: Category | null;
  inventory: InventoryItem | null;
};

export type OrderWithItems = Order & {
  items: (OrderItem & {
    product: { name: string };
    variant: { name: string; groupName: string } | null;
  })[];
};

export type CategoryWithProducts = Category & {
  products: ProductWithVariants[];
};

// Cart (lado do cliente, storefront)

export interface CartItem {
  productId: string;
  variantId?: string;
  productName: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

export interface CartState {
  tenantSlug: string;
  items: CartItem[];
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  notes: string;
}

// Labels para exibição

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Aguardando",
  CONFIRMED: "Em preparo",
  READY: "Pronto",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelado",
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  READY: "bg-green-100 text-green-800",
  DELIVERED: "bg-gray-100 text-gray-600",
  CANCELLED: "bg-red-100 text-red-800",
};

export const ORDER_CHANNEL_LABELS: Record<OrderChannel, string> = {
  STOREFRONT: "Site",
  COUNTER: "Balcão",
  WHATSAPP: "WhatsApp",
  EXTERNAL: "Externo",
};

export const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Dono",
  MANAGER: "Gerente",
  OPERATOR: "Operador",
};
