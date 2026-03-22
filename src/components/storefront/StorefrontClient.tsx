"use client";

import { useState } from "react";
import type { Tenant, Category, Product, ProductVariant, InventoryItem } from "@prisma/client";
import { formatCurrency } from "@/lib/utils";
import type { CartItem } from "@/types";

type ProductWithDetails = Product & {
  variants: ProductVariant[];
  inventory: InventoryItem | null;
};

interface Props {
  tenant: Tenant;
  categories: Category[];
  products: ProductWithDetails[];
}

export function StorefrontClient({ tenant, categories, products }: Props) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithDetails | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  function addToCart(item: CartItem) {
    setCart((prev) => {
      const key = `${item.productId}-${item.variantId ?? ""}`;
      const existing = prev.find(
        (i) => `${i.productId}-${i.variantId ?? ""}` === key
      );
      if (existing) {
        return prev.map((i) =>
          `${i.productId}-${i.variantId ?? ""}` === key
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        );
      }
      return [...prev, item];
    });
  }

  function removeFromCart(productId: string, variantId?: string) {
    const key = `${productId}-${variantId ?? ""}`;
    setCart((prev) =>
      prev.filter((i) => `${i.productId}-${i.variantId ?? ""}` !== key)
    );
  }

  const totalItems = cart.reduce((s, i) => s + i.quantity, 0);
  const totalAmount = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

  // Agrupar produtos por categoria
  const productsByCategory = categories
    .map((cat) => ({
      category: cat,
      products: products.filter((p) => p.categoryId === cat.id),
    }))
    .filter((g) => g.products.length > 0);

  const uncategorized = products.filter((p) => !p.categoryId);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          {tenant.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={tenant.logoUrl}
              alt={tenant.name}
              className="h-10 object-contain mb-2"
            />
          )}
          <h1 className="text-xl font-bold text-gray-900">{tenant.name}</h1>
          {tenant.description && (
            <p className="text-sm text-gray-500 mt-0.5">{tenant.description}</p>
          )}
        </div>
      </header>

      {/* Products */}
      <div className="max-w-2xl mx-auto px-4 py-6 pb-28">
        {productsByCategory.map(({ category, products: catProducts }) => (
          <div key={category.id} className="mb-6">
            <h2 className="text-base font-bold text-gray-800 mb-3">
              {category.name}
            </h2>
            <div className="space-y-3">
              {catProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onSelect={() => setSelectedProduct(product)}
                />
              ))}
            </div>
          </div>
        ))}

        {uncategorized.length > 0 && (
          <div className="mb-6">
            <h2 className="text-base font-bold text-gray-800 mb-3">Outros</h2>
            <div className="space-y-3">
              {uncategorized.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onSelect={() => setSelectedProduct(product)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Cart Button */}
      {totalItems > 0 && (
        <div className="fixed bottom-4 left-0 right-0 flex justify-center z-20 px-4">
          <button
            onClick={() => setCheckoutOpen(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-2xl shadow-lg flex items-center gap-4 max-w-sm w-full"
          >
            <span className="bg-orange-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
              {totalItems}
            </span>
            <span className="flex-1 text-left">Ver carrinho</span>
            <span>{formatCurrency(totalAmount)}</span>
          </button>
        </div>
      )}

      {/* Product Modal */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAdd={(item) => {
            addToCart(item);
            setSelectedProduct(null);
          }}
        />
      )}

      {/* Checkout Modal */}
      {checkoutOpen && (
        <CheckoutModal
          tenantSlug={tenant.slug}
          cart={cart}
          totalAmount={totalAmount}
          onRemove={removeFromCart}
          onClose={() => setCheckoutOpen(false)}
          onSuccess={() => {
            setCart([]);
            setCheckoutOpen(false);
          }}
        />
      )}
    </div>
  );
}

function ProductCard({
  product,
  onSelect,
}: {
  product: ProductWithDetails;
  onSelect: () => void;
}) {
  const outOfStock =
    product.inventory?.trackStock && (product.inventory?.quantity ?? 0) <= 0;

  return (
    <button
      onClick={onSelect}
      disabled={outOfStock}
      className="w-full bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4 hover:border-orange-300 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <div className="flex-1">
        <p className="font-medium text-gray-900">{product.name}</p>
        {product.description && (
          <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
            {product.description}
          </p>
        )}
        <p className="text-orange-500 font-semibold mt-1">
          {formatCurrency(product.basePrice)}
        </p>
        {outOfStock && (
          <span className="text-xs text-red-500 font-medium">Esgotado</span>
        )}
      </div>
      {product.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-20 h-20 object-cover rounded-lg shrink-0"
        />
      )}
    </button>
  );
}

function ProductModal({
  product,
  onClose,
  onAdd,
}: {
  product: ProductWithDetails;
  onClose: () => void;
  onAdd: (item: CartItem) => void;
}) {
  const [quantity, setQuantity] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(
    product.variants[0]?.id
  );
  const [notes, setNotes] = useState("");

  const selectedVariant = product.variants.find((v) => v.id === selectedVariantId);
  const price = product.basePrice + (selectedVariant?.price ?? 0);

  // Agrupar variants por groupName
  const variantGroups = product.variants.reduce(
    (acc, v) => {
      if (!acc[v.groupName]) acc[v.groupName] = [];
      acc[v.groupName].push(v);
      return acc;
    },
    {} as Record<string, ProductVariant[]>
  );

  function handleAdd() {
    onAdd({
      productId: product.id,
      variantId: selectedVariantId,
      productName: product.name,
      variantName: selectedVariant?.name,
      quantity,
      unitPrice: price,
      notes,
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-30 flex items-end justify-center sm:items-center">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">{product.name}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-4 space-y-4">
          {product.description && (
            <p className="text-sm text-gray-600">{product.description}</p>
          )}

          {/* Variantes */}
          {Object.entries(variantGroups).map(([group, variants]) => (
            <div key={group}>
              <p className="text-sm font-semibold text-gray-700 mb-2">{group}</p>
              <div className="space-y-2">
                {variants.map((v) => (
                  <label
                    key={v.id}
                    className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors"
                    style={{
                      borderColor: selectedVariantId === v.id ? "#f97316" : "#e5e7eb",
                      background: selectedVariantId === v.id ? "#fff7ed" : "white",
                    }}
                  >
                    <input
                      type="radio"
                      name={group}
                      value={v.id}
                      checked={selectedVariantId === v.id}
                      onChange={() => setSelectedVariantId(v.id)}
                      className="accent-orange-500"
                    />
                    <span className="text-sm flex-1">{v.name}</span>
                    {v.price > 0 && (
                      <span className="text-sm text-orange-500">
                        +{formatCurrency(v.price)}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          ))}

          {/* Observações */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">
              Observações
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: sem cebola, ponto da carne..."
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
            />
          </div>

          {/* Quantidade */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-8 h-8 rounded-lg bg-white shadow-sm font-bold text-gray-700"
              >
                -
              </button>
              <span className="w-6 text-center font-semibold">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="w-8 h-8 rounded-lg bg-white shadow-sm font-bold text-gray-700"
              >
                +
              </button>
            </div>
            <button
              onClick={handleAdd}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 rounded-xl transition-colors"
            >
              Adicionar · {formatCurrency(price * quantity)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckoutModal({
  tenantSlug,
  cart,
  totalAmount,
  onRemove,
  onClose,
  onSuccess,
}: {
  tenantSlug: string;
  cart: CartItem[];
  totalAmount: number;
  onRemove: (productId: string, variantId?: string) => void;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleOrder() {
    setLoading(true);
    setError("");

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenantSlug,
        channel: "STOREFRONT",
        customerName: form.name,
        customerPhone: form.phone,
        customerAddress: form.address,
        notes: form.notes,
        items: cart.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          notes: i.notes,
        })),
      }),
    });

    setLoading(false);

    if (!res.ok) {
      setError("Erro ao enviar pedido. Tente novamente.");
      return;
    }

    setSuccess(true);
    setTimeout(() => onSuccess(), 2500);
  }

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/50 z-30 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-xs w-full">
          <div className="text-5xl mb-3">🎉</div>
          <h3 className="text-xl font-bold text-gray-900">Pedido enviado!</h3>
          <p className="text-gray-500 text-sm mt-2">
            Aguarde a confirmação da marmitaria.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-30 flex items-end justify-center sm:items-center">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Seu pedido</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ×
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Items */}
          <div className="space-y-2">
            {cart.map((item) => (
              <div
                key={`${item.productId}-${item.variantId ?? ""}`}
                className="flex items-center gap-3"
              >
                <span className="text-sm text-gray-500 w-6 text-right">
                  {item.quantity}x
                </span>
                <span className="text-sm flex-1">
                  {item.productName}
                  {item.variantName && (
                    <span className="text-gray-400"> ({item.variantName})</span>
                  )}
                </span>
                <span className="text-sm text-gray-700">
                  {formatCurrency(item.unitPrice * item.quantity)}
                </span>
                <button
                  onClick={() => onRemove(item.productId, item.variantId)}
                  className="text-gray-300 hover:text-red-400 text-lg leading-none"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-100">
            <span>Total</span>
            <span className="text-orange-500">{formatCurrency(totalAmount)}</span>
          </div>

          <hr />

          {/* Customer info */}
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Seu nome *"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <input
              type="tel"
              placeholder="WhatsApp (opcional)"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <input
              type="text"
              placeholder="Endereço de entrega (opcional)"
              value={form.address}
              onChange={(e) =>
                setForm((f) => ({ ...f, address: e.target.value }))
              }
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <textarea
              placeholder="Observações gerais (opcional)"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <button
            onClick={handleOrder}
            disabled={loading || !form.name}
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold rounded-xl transition-colors"
          >
            {loading ? "Enviando..." : `Fazer pedido · ${formatCurrency(totalAmount)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
