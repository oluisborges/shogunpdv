"use client";

import { useEffect, useState } from "react";
import type { OrderWithItems } from "@/types";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  ORDER_CHANNEL_LABELS,
} from "@/types";
import type { OrderStatus } from "@prisma/client";
import { formatCurrency } from "@/lib/tenant";

const STATUS_FLOW: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "READY",
  "DELIVERED",
];

function getNextStatus(current: OrderStatus): OrderStatus | null {
  const idx = STATUS_FLOW.indexOf(current);
  if (idx === -1 || idx === STATUS_FLOW.length - 1) return null;
  return STATUS_FLOW[idx + 1];
}

export function OrdersDashboard({
  initialOrders,
  tenantId,
}: {
  initialOrders: OrderWithItems[];
  tenantId: string;
}) {
  const [orders, setOrders] = useState<OrderWithItems[]>(initialOrders);
  const [filter, setFilter] = useState<OrderStatus | "ALL">("ALL");
  const [updating, setUpdating] = useState<string | null>(null);

  // SSE — recebe novos pedidos e atualizações em tempo real
  useEffect(() => {
    const es = new EventSource("/api/sse");

    es.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);

        if (payload.type === "NEW_ORDER") {
          setOrders((prev) => {
            const exists = prev.some((o) => o.id === payload.order.id);
            if (exists) return prev;
            return [payload.order, ...prev];
          });
        }

        if (payload.type === "ORDER_UPDATED") {
          setOrders((prev) =>
            prev.map((o) =>
              o.id === payload.order.id ? payload.order : o
            )
          );
        }
      } catch {}
    };

    return () => es.close();
  }, []);

  async function advanceStatus(order: OrderWithItems) {
    const next = getNextStatus(order.status);
    if (!next) return;

    setUpdating(order.id);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (res.ok) {
        const updated = await res.json();
        setOrders((prev) =>
          prev.map((o) => (o.id === updated.id ? updated : o))
        );
      }
    } finally {
      setUpdating(null);
    }
  }

  async function cancelOrder(order: OrderWithItems) {
    if (!confirm("Cancelar este pedido?")) return;
    setUpdating(order.id);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      if (res.ok) {
        const updated = await res.json();
        setOrders((prev) =>
          prev.map((o) => (o.id === updated.id ? updated : o))
        );
      }
    } finally {
      setUpdating(null);
    }
  }

  const filtered =
    filter === "ALL"
      ? orders.filter((o) => o.status !== "DELIVERED" && o.status !== "CANCELLED")
      : orders.filter((o) => o.status === filter);

  return (
    <div>
      {/* Filtros */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(["ALL", "PENDING", "CONFIRMED", "READY"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === s
                ? "bg-orange-500 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {s === "ALL" ? "Ativos" : ORDER_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">Nenhum pedido ainda</p>
          <p className="text-sm mt-1">Novos pedidos aparecerão aqui automaticamente</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              loading={updating === order.id}
              onAdvance={() => advanceStatus(order)}
              onCancel={() => cancelOrder(order)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderCard({
  order,
  loading,
  onAdvance,
  onCancel,
}: {
  order: OrderWithItems;
  loading: boolean;
  onAdvance: () => void;
  onCancel: () => void;
}) {
  const nextStatus = getNextStatus(order.status);
  const isTerminal = order.status === "DELIVERED" || order.status === "CANCELLED";

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-orange-200 transition-colors">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold text-gray-900">#{order.number}</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${ORDER_STATUS_COLORS[order.status]}`}
          >
            {ORDER_STATUS_LABELS[order.status]}
          </span>
        </div>
        <span className="text-xs text-gray-400">
          {ORDER_CHANNEL_LABELS[order.channel]}
        </span>
      </div>

      {/* Items */}
      <div className="px-4 py-3 space-y-1">
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <span className="text-gray-700">
              {item.quantity}x {item.product.name}
              {item.variant && (
                <span className="text-gray-400 text-xs ml-1">
                  ({item.variant.name})
                </span>
              )}
              {item.notes && (
                <span className="text-gray-400 text-xs block ml-3">
                  obs: {item.notes}
                </span>
              )}
            </span>
            <span className="text-gray-600 ml-2 shrink-0">
              {formatCurrency(item.unitPrice * item.quantity)}
            </span>
          </div>
        ))}

        {order.notes && (
          <p className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
            obs: {order.notes}
          </p>
        )}
      </div>

      {/* Customer */}
      {(order.customerName || order.customerAddress) && (
        <div className="px-4 pb-3 text-xs text-gray-500 space-y-0.5">
          {order.customerName && <p>Cliente: {order.customerName}</p>}
          {order.customerPhone && <p>Tel: {order.customerPhone}</p>}
          {order.customerAddress && <p>End: {order.customerAddress}</p>}
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
        <span className="font-semibold text-gray-900">
          {formatCurrency(order.totalAmount)}
        </span>

        {!isTerminal && (
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              disabled={loading}
              className="text-xs px-2 py-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            {nextStatus && (
              <button
                onClick={onAdvance}
                disabled={loading}
                className="text-xs px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {loading ? "..." : ORDER_STATUS_LABELS[nextStatus]}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
