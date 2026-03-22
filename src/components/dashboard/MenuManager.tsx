"use client";

import { useState } from "react";
import type { Category, Product, ProductVariant, InventoryItem } from "@prisma/client";
import { formatCurrency } from "@/lib/utils";

type ProductFull = Product & {
  variants: ProductVariant[];
  category: Category | null;
  inventory: InventoryItem | null;
};

interface Props {
  initialCategories: Category[];
  initialProducts: ProductFull[];
  tenantSlug: string;
}

export function MenuManager({ initialCategories, initialProducts, tenantSlug }: Props) {
  const [categories, setCategories] = useState(initialCategories);
  const [products, setProducts] = useState(initialProducts);
  const [showProductForm, setShowProductForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductFull | null>(null);

  async function addCategory(name: string) {
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const cat = await res.json();
      setCategories((prev) => [...prev, cat]);
      setShowCategoryForm(false);
    }
  }

  async function toggleProduct(product: ProductFull) {
    const res = await fetch(`/api/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...product, active: !product.active }),
    });
    if (res.ok) {
      const updated = await res.json();
      setProducts((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p))
      );
    }
  }

  async function deleteProduct(id: string) {
    if (!confirm("Remover este produto?")) return;
    const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
    if (res.ok) {
      setProducts((prev) => prev.filter((p) => p.id !== id));
    }
  }

  function handleProductSaved(product: ProductFull) {
    setProducts((prev) => {
      const exists = prev.find((p) => p.id === product.id);
      return exists
        ? prev.map((p) => (p.id === product.id ? product : p))
        : [product, ...prev];
    });
    setShowProductForm(false);
    setEditingProduct(null);
  }

  return (
    <div>
      {/* Actions */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => { setEditingProduct(null); setShowProductForm(true); }}
          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-semibold transition-colors"
        >
          + Novo produto
        </button>
        <button
          onClick={() => setShowCategoryForm(true)}
          className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition-colors"
        >
          + Categoria
        </button>
        <a
          href={`/${tenantSlug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition-colors"
        >
          Ver cardápio
        </a>
      </div>

      {/* Products list */}
      {products.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p>Nenhum produto ainda</p>
          <p className="text-sm mt-1">Adicione o primeiro item do seu cardápio</p>
        </div>
      ) : (
        <div className="space-y-2">
          {products.map((product) => (
            <div
              key={product.id}
              className={`bg-white rounded-xl border p-4 flex items-center gap-4 ${
                product.active ? "border-gray-200" : "border-gray-100 opacity-60"
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 truncate">
                    {product.name}
                  </span>
                  {!product.active && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                      Oculto
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-orange-500 font-semibold text-sm">
                    {formatCurrency(product.basePrice)}
                  </span>
                  {product.category && (
                    <span className="text-xs text-gray-400">
                      {product.category.name}
                    </span>
                  )}
                  {product.variants.length > 0 && (
                    <span className="text-xs text-gray-400">
                      {product.variants.length} opç{product.variants.length !== 1 ? "ões" : "ão"}
                    </span>
                  )}
                  {product.inventory?.trackStock && (
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full ${
                        (product.inventory?.quantity ?? 0) <= (product.inventory?.minAlert ?? 5)
                          ? "bg-red-100 text-red-600"
                          : "bg-green-100 text-green-600"
                      }`}
                    >
                      {product.inventory?.quantity ?? 0} em estoque
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggleProduct(product)}
                  className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  {product.active ? "Ocultar" : "Mostrar"}
                </button>
                <button
                  onClick={() => { setEditingProduct(product); setShowProductForm(true); }}
                  className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  Editar
                </button>
                <button
                  onClick={() => deleteProduct(product.id)}
                  className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-red-400 hover:bg-red-50 transition-colors"
                >
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Category form */}
      {showCategoryForm && (
        <CategoryFormModal
          onClose={() => setShowCategoryForm(false)}
          onSave={addCategory}
        />
      )}

      {/* Product form */}
      {showProductForm && (
        <ProductFormModal
          categories={categories}
          product={editingProduct}
          onClose={() => { setShowProductForm(false); setEditingProduct(null); }}
          onSave={handleProductSaved}
        />
      )}
    </div>
  );
}

function CategoryFormModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState("");

  return (
    <div className="fixed inset-0 bg-black/50 z-30 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6">
        <h3 className="font-bold text-gray-900 mb-4">Nova categoria</h3>
        <input
          type="text"
          autoFocus
          placeholder="Ex: Pratos, Bebidas, Sobremesas"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 mb-4"
        />
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => name && onSave(name)}
            disabled={!name}
            className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold disabled:bg-orange-300"
          >
            Criar
          </button>
        </div>
      </div>
    </div>
  );
}

interface ProductFormValues {
  name: string;
  description: string;
  basePrice: string;
  categoryId: string;
  trackStock: boolean;
  initialStock: string;
  variants: { name: string; groupName: string; price: string }[];
}

function ProductFormModal({
  categories,
  product,
  onClose,
  onSave,
}: {
  categories: Category[];
  product: ProductFull | null;
  onClose: () => void;
  onSave: (p: ProductFull) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<ProductFormValues>({
    name: product?.name ?? "",
    description: product?.description ?? "",
    basePrice: product ? String(product.basePrice) : "",
    categoryId: product?.categoryId ?? "",
    trackStock: product?.inventory?.trackStock ?? true,
    initialStock: product?.inventory ? String(product.inventory.quantity) : "0",
    variants: product?.variants.map((v) => ({
      name: v.name,
      groupName: v.groupName,
      price: String(v.price),
    })) ?? [],
  });

  function addVariant() {
    setForm((f) => ({
      ...f,
      variants: [...f.variants, { name: "", groupName: "Proteína", price: "0" }],
    }));
  }

  function removeVariant(i: number) {
    setForm((f) => ({
      ...f,
      variants: f.variants.filter((_, idx) => idx !== i),
    }));
  }

  async function handleSave() {
    setLoading(true);
    const payload = {
      name: form.name,
      description: form.description,
      basePrice: parseFloat(form.basePrice),
      categoryId: form.categoryId || undefined,
      trackStock: form.trackStock,
      initialStock: parseInt(form.initialStock),
      variants: form.variants.map((v) => ({
        name: v.name,
        groupName: v.groupName,
        price: parseFloat(v.price) || 0,
      })),
    };

    const url = product ? `/api/products/${product.id}` : "/api/products";
    const method = product ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);
    if (res.ok) {
      const saved = await res.json();
      onSave(saved);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-30 flex items-end justify-center sm:items-center">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
          <h3 className="font-bold text-gray-900">
            {product ? "Editar produto" : "Novo produto"}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">
            ×
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Nome *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Ex: Marmita Fitness"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Descrição
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
              placeholder="Ingredientes, informações..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Preço (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.basePrice}
                onChange={(e) => setForm((f) => ({ ...f, basePrice: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="0,00"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Categoria
              </label>
              <select
                value={form.categoryId}
                onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">Sem categoria</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Estoque */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              id="trackStock"
              checked={form.trackStock}
              onChange={(e) => setForm((f) => ({ ...f, trackStock: e.target.checked }))}
              className="accent-orange-500 w-4 h-4"
            />
            <label htmlFor="trackStock" className="text-sm font-medium text-gray-700">
              Controlar estoque
            </label>
            {form.trackStock && (
              <input
                type="number"
                min="0"
                value={form.initialStock}
                onChange={(e) => setForm((f) => ({ ...f, initialStock: e.target.value }))}
                className="ml-auto w-24 px-3 py-1.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Qtd"
              />
            )}
          </div>

          {/* Variantes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                Opções (proteínas, tamanhos...)
              </label>
              <button
                type="button"
                onClick={addVariant}
                className="text-xs text-orange-500 hover:text-orange-600 font-medium"
              >
                + Adicionar
              </button>
            </div>
            {form.variants.map((v, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Nome (ex: Frango)"
                  value={v.name}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      variants: f.variants.map((vv, ii) =>
                        ii === i ? { ...vv, name: e.target.value } : vv
                      ),
                    }))
                  }
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <input
                  type="text"
                  placeholder="Grupo (ex: Proteína)"
                  value={v.groupName}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      variants: f.variants.map((vv, ii) =>
                        ii === i ? { ...vv, groupName: e.target.value } : vv
                      ),
                    }))
                  }
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <input
                  type="number"
                  placeholder="+R$"
                  value={v.price}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      variants: f.variants.map((vv, ii) =>
                        ii === i ? { ...vv, price: e.target.value } : vv
                      ),
                    }))
                  }
                  className="w-16 px-2 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button
                  type="button"
                  onClick={() => removeVariant(i)}
                  className="text-gray-300 hover:text-red-400 px-1"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={loading || !form.name || !form.basePrice}
              className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold disabled:bg-orange-300"
            >
              {loading ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
