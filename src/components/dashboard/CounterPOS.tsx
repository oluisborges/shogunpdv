"use client";

import { useState } from "react";
import type { Category, Product, ProductVariant, InventoryItem } from "@prisma/client";
import { formatCurrency } from "@/lib/utils";
import type { CartItem } from "@/types";

type ProductFull = Product & {
  variants: ProductVariant[];
  inventory: InventoryItem | null;
  category: Category | null;
};

interface Props {
  categories: Category[];
  products: ProductFull[];
  tenantSlug: string;
}

export function CounterPOS({ categories, products, tenantSlug }: Props) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductFull | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const totalAmount = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

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
    setSelectedProduct(null);
  }

  function changeQty(productId: string, variantId: string | undefined, delta: number) {
    const key = `${productId}-${variantId ?? ""}`;
    setCart((prev) =>
      prev
        .map((i) =>
          `${i.productId}-${i.variantId ?? ""}` === key
            ? { ...i, quantity: i.quantity + delta }
            : i
        )
        .filter((i) => i.quantity > 0)
    );
  }

  async function submitOrder() {
    if (cart.length === 0) return;
    setLoading(true);

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenantSlug,
        channel: "COUNTER",
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
        notes: notes || undefined,
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

    if (res.ok) {
      const order = await res.json();
      setSuccess(order.number);
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setNotes("");
      setTimeout(() => setSuccess(null), 3000);
    }
  }

  const filteredProducts =
    activeCategory === "all"
      ? products
      : products.filter((p) => p.categoryId === activeCategory);

  return (
    <div className="flex gap-4 h-[calc(100vh-120px)]">
      {/* Left: Products */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Category tabs */}
        <div className="flex gap-2 mb-3 flex-wrap">
          <button
            onClick={() => setActiveCategory("all")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeCategory === "all"
                ? "bg-orange-500 text-white"
                : "bg-white border border-gray-200 text-gray-600"
            }`}
          >
            Todos
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeCategory === c.id
                  ? "bg-orange-500 text-white"
                  : "bg-white border border-gray-200 text-gray-600"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {filteredProducts.map((product) => {
              const outOfStock =
                product.inventory?.trackStock &&
                (product.inventory?.quantity ?? 0) <= 0;

              return (
                <button
                  key={product.id}
                  onClick={() =>
                    product.variants.length > 0
                      ? setSelectedProduct(product)
                      : addToCart({
                          productId: product.id,
                          productName: product.name,
                          quantity: 1,
                          unitPrice: product.basePrice,
                        })
                  }
                  disabled={outOfStock}
                  className="bg-white rounded-xl border border-gray-200 p-3 text-left hover:border-orange-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <p className="font-medium text-sm text-gray-900 leading-tight">
                    {product.name}
                  </p>
                  {product.category && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {product.category.name}
                    </p>
                  )}
                  <p className="text-orange-500 font-semibold text-sm mt-1.5">
                    {formatCurrency(product.basePrice)}
                  </p>
                  {outOfStock && (
                    <span className="text-xs text-red-400">Esgotado</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right: Cart */}
      <div className="w-72 flex flex-col bg-white rounded-xl border border-gray-200 p-4 shrink-0">
        <h2 className="font-semibold text-gray-900 mb-3">Pedido</h2>

        {/* Customer */}
        <div className="space-y-2 mb-3">
          <input
            type="text"
            placeholder="Nome do cliente"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <input
            type="tel"
            placeholder="Telefone (opcional)"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <hr className="mb-3" />

        {/* Items */}
        <div className="flex-1 overflow-y-auto space-y-2 mb-3">
          {cart.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              Clique nos produtos para adicionar
            </p>
          ) : (
            cart.map((item) => (
              <div
                key={`${item.productId}-${item.variantId ?? ""}`}
                className="flex items-center gap-2"
              >
                <div className="flex items-center gap-1">
                  <button
                    onClick={() =>
                      changeQty(item.productId, item.variantId, -1)
                    }
                    className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-bold"
                  >
                    -
                  </button>
                  <span className="w-5 text-center text-sm font-medium">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() =>
                      changeQty(item.productId, item.variantId, 1)
                    }
                    className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-bold"
                  >
                    +
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-700 truncate">
                    {item.productName}
                    {item.variantName && (
                      <span className="text-gray-400"> · {item.variantName}</span>
                    )}
                  </p>
                </div>
                <span className="text-xs text-gray-600 shrink-0">
                  {formatCurrency(item.unitPrice * item.quantity)}
                </span>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <>
            <textarea
              placeholder="Observações..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none mb-3"
            />

            <div className="flex justify-between font-bold text-gray-900 mb-3">
              <span>Total</span>
              <span className="text-orange-500">{formatCurrency(totalAmount)}</span>
            </div>

            <button
              onClick={submitOrder}
              disabled={loading}
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold rounded-xl transition-colors"
            >
              {loading ? "Registrando..." : "Registrar pedido"}
            </button>
          </>
        )}

        {success && (
          <div className="mt-3 text-center text-sm text-green-600 bg-green-50 rounded-lg py-2">
            Pedido #{success} registrado!
          </div>
        )}
      </div>

      {/* Variant selector modal */}
      {selectedProduct && (
        <VariantModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAdd={addToCart}
        />
      )}
    </div>
  );
}

function VariantModal({
  product,
  onClose,
  onAdd,
}: {
  product: ProductFull;
  onClose: () => void;
  onAdd: (item: CartItem) => void;
}) {
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    product.variants[0]?.id ?? ""
  );

  const selectedVariant = product.variants.find((v) => v.id === selectedVariantId);
  const price = product.basePrice + (selectedVariant?.price ?? 0);

  const variantGroups = product.variants.reduce(
    (acc, v) => {
      if (!acc[v.groupName]) acc[v.groupName] = [];
      acc[v.groupName].push(v);
      return acc;
    },
    {} as Record<string, ProductVariant[]>
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-30 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-xs p-6">
        <h3 className="font-bold text-gray-900 mb-4">{product.name}</h3>

        {Object.entries(variantGroups).map(([group, variants]) => (
          <div key={group} className="mb-4">
            <p className="text-sm font-medium text-gray-600 mb-2">{group}</p>
            <div className="grid grid-cols-2 gap-2">
              {variants.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVariantId(v.id)}
                  className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                    selectedVariantId === v.id
                      ? "border-orange-500 bg-orange-50 text-orange-700"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {v.name}
                  {v.price > 0 && (
                    <span className="block text-xs text-gray-400">
                      +{formatCurrency(v.price)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="flex gap-3 mt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600"
          >
            Cancelar
          </button>
          <button
            onClick={() =>
              onAdd({
                productId: product.id,
                variantId: selectedVariantId || undefined,
                productName: product.name,
                variantName: selectedVariant?.name,
                quantity: 1,
                unitPrice: price,
              })
            }
            className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold"
          >
            {formatCurrency(price)}
          </button>
        </div>
      </div>
    </div>
  );
}
