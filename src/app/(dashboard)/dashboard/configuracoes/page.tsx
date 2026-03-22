"use client";

import { useState, useEffect } from "react";

interface TenantData {
  name: string;
  slug: string;
  phone: string;
  address: string;
  description: string;
}

export default function ConfiguracoesPage() {
  const [form, setForm] = useState<TenantData>({
    name: "",
    slug: "",
    phone: "",
    address: "",
    description: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/tenant")
      .then((r) => r.json())
      .then((data: TenantData) =>
        setForm({
          name: data.name ?? "",
          slug: data.slug ?? "",
          phone: data.phone ?? "",
          address: data.address ?? "",
          description: data.description ?? "",
        })
      )
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/tenant", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-16 text-gray-400">Carregando...</div>
    );
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Configurações</h1>

      <form onSubmit={handleSave} className="space-y-4 bg-white rounded-xl border border-gray-200 p-6">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">
            Nome da marmitaria
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">
            Link do cardápio
          </label>
          <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-orange-500">
            <span className="px-3 py-2.5 bg-gray-50 text-gray-500 text-sm border-r border-gray-300">
              shogunpdv.com/
            </span>
            <span className="px-3 py-2.5 text-sm text-gray-500 bg-gray-50">
              {form.slug}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            O endereço não pode ser alterado após o cadastro.
          </p>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">
            Telefone / WhatsApp
          </label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="(11) 99999-9999"
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">
            Endereço
          </label>
          <input
            type="text"
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            placeholder="Rua, número, bairro, cidade"
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">
            Descrição (aparece no cardápio)
          </label>
          <textarea
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            rows={3}
            placeholder="Marmitas saudáveis e saborosas, entrega de segunda a sexta..."
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold rounded-lg transition-colors"
        >
          {saving ? "Salvando..." : saved ? "Salvo!" : "Salvar alterações"}
        </button>
      </form>

      {/* Link section */}
      <div className="mt-4 bg-orange-50 rounded-xl border border-orange-200 p-4">
        <p className="text-sm font-medium text-orange-800 mb-2">
          Seu cardápio online
        </p>
        <p className="text-sm text-orange-600 font-mono break-all">
          https://shogunpdv.com/{form.slug}
        </p>
        <p className="text-xs text-orange-500 mt-2">
          Compartilhe esse link com seus clientes pelo WhatsApp, Instagram, etc.
        </p>
      </div>
    </div>
  );
}
