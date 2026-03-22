"use client";

import { useState } from "react";
import type { InventoryItem, StockMovement } from "@prisma/client";

type InventoryFull = InventoryItem & {
  product: {
    id: string;
    name: string;
    active: boolean;
    category: { name: string } | null;
  };
  stockMovements: StockMovement[];
};

export function InventoryManager({
  initialInventory,
}: {
  initialInventory: InventoryFull[];
}) {
  const [inventory, setInventory] = useState(initialInventory);
  const [adjusting, setAdjusting] = useState<InventoryFull | null>(null);
  const [filter, setFilter] = useState<"all" | "low" | "out">("all");

  const filtered = inventory.filter((item) => {
    if (!item.trackStock) return filter === "all";
    if (filter === "low") return item.quantity <= item.minAlert && item.quantity > 0;
    if (filter === "out") return item.quantity <= 0;
    return true;
  });

  const lowCount = inventory.filter(
    (i) => i.trackStock && i.quantity <= i.minAlert && i.quantity > 0
  ).length;
  const outCount = inventory.filter(
    (i) => i.trackStock && i.quantity <= 0
  ).length;

  async function handleAdjust(
    item: InventoryFull,
    quantity: number,
    type: "IN" | "ADJUST",
    reason: string
  ) {
    const res = await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: item.product.id,
        quantity,
        type,
        reason,
      }),
    });

    if (res.ok) {
      const updated = await res.json();
      setInventory((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, quantity: updated.quantity } : i
        )
      );
      setAdjusting(null);
    }
  }

  return (
    <div>
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <button
          onClick={() => setFilter("all")}
          className={`p-4 rounded-xl border text-left transition-colors ${
            filter === "all"
              ? "border-orange-300 bg-orange-50"
              : "border-gray-200 bg-white hover:bg-gray-50"
          }`}
        >
          <p className="text-2xl font-bold text-gray-900">{inventory.length}</p>
          <p className="text-sm text-gray-500 mt-1">Total de itens</p>
        </button>
        <button
          onClick={() => setFilter("low")}
          className={`p-4 rounded-xl border text-left transition-colors ${
            filter === "low"
              ? "border-yellow-300 bg-yellow-50"
              : "border-gray-200 bg-white hover:bg-gray-50"
          }`}
        >
          <p className="text-2xl font-bold text-yellow-600">{lowCount}</p>
          <p className="text-sm text-gray-500 mt-1">Estoque baixo</p>
        </button>
        <button
          onClick={() => setFilter("out")}
          className={`p-4 rounded-xl border text-left transition-colors ${
            filter === "out"
              ? "border-red-300 bg-red-50"
              : "border-gray-200 bg-white hover:bg-gray-50"
          }`}
        >
          <p className="text-2xl font-bold text-red-600">{outCount}</p>
          <p className="text-sm text-gray-500 mt-1">Esgotados</p>
        </button>
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">
                {item.product.name}
              </p>
              {item.product.category && (
                <p className="text-xs text-gray-400">{item.product.category.name}</p>
              )}
            </div>

            {item.trackStock ? (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p
                    className={`text-xl font-bold ${
                      item.quantity <= 0
                        ? "text-red-500"
                        : item.quantity <= item.minAlert
                        ? "text-yellow-500"
                        : "text-green-600"
                    }`}
                  >
                    {item.quantity}
                  </p>
                  <p className="text-xs text-gray-400">em estoque</p>
                </div>
                <button
                  onClick={() => setAdjusting(item)}
                  className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-sm text-gray-600 rounded-lg transition-colors"
                >
                  Ajustar
                </button>
              </div>
            ) : (
              <span className="text-xs text-gray-400">Sem controle</span>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p>Nenhum item nesta categoria</p>
          </div>
        )}
      </div>

      {/* Adjust Modal */}
      {adjusting && (
        <AdjustModal
          item={adjusting}
          onClose={() => setAdjusting(null)}
          onSave={handleAdjust}
        />
      )}
    </div>
  );
}

function AdjustModal({
  item,
  onClose,
  onSave,
}: {
  item: InventoryFull;
  onClose: () => void;
  onSave: (
    item: InventoryFull,
    quantity: number,
    type: "IN" | "ADJUST",
    reason: string
  ) => void;
}) {
  const [type, setType] = useState<"IN" | "ADJUST">("IN");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty < 0) return;
    setLoading(true);
    await onSave(item, qty, type, reason);
    setLoading(false);
  }

  const preview =
    type === "IN"
      ? item.quantity + (parseInt(quantity) || 0)
      : parseInt(quantity) || 0;

  return (
    <div className="fixed inset-0 bg-black/50 z-30 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6">
        <h3 className="font-bold text-gray-900 mb-1">Ajustar estoque</h3>
        <p className="text-sm text-gray-500 mb-4">{item.product.name}</p>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setType("IN")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              type === "IN"
                ? "bg-green-500 text-white"
                : "border border-gray-200 text-gray-600"
            }`}
          >
            Entrada (+)
          </button>
          <button
            onClick={() => setType("ADJUST")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              type === "ADJUST"
                ? "bg-blue-500 text-white"
                : "border border-gray-200 text-gray-600"
            }`}
          >
            Acerto direto
          </button>
        </div>

        <div className="mb-3">
          <label className="text-sm font-medium text-gray-700 block mb-1">
            {type === "IN" ? "Quantidade a adicionar" : "Novo total em estoque"}
          </label>
          <input
            type="number"
            min="0"
            autoFocus
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="0"
          />
        </div>

        <div className="mb-4">
          <label className="text-sm font-medium text-gray-700 block mb-1">
            Motivo (opcional)
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="Ex: Compra fornecedor, correção..."
          />
        </div>

        {quantity && (
          <p className="text-sm text-gray-500 mb-4 bg-gray-50 px-3 py-2 rounded-lg">
            Estoque atual: <strong>{item.quantity}</strong> → após ajuste:{" "}
            <strong className="text-orange-500">{preview}</strong>
          </p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !quantity}
            className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold disabled:bg-orange-300"
          >
            {loading ? "..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
