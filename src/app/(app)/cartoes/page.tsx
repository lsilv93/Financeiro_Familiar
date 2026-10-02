"use client";
import { useState } from "react";
import { api, brl, useApi } from "@/lib/client";
import type { Card } from "@/lib/types";
import { Empty, ErrorBox, PageHeader, ScopeBadge, SectionTitle, Spinner } from "@/components/ui";

export default function CartoesPage() {
  const { data, error, loading, reload } = useApi<Card[]>("/api/cards");
  const [f, setF] = useState({ name: "", limit: "", dueDay: "", closingDay: "", scope: "PERSONAL" });
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setErr(null);
    try {
      await api("/api/cards", { method: "POST", body: { name: f.name, limit: Number(f.limit.replace(",", ".")) || 0, dueDay: Number(f.dueDay), closingDay: f.closingDay ? Number(f.closingDay) : null, scope: f.scope } });
      setF({ name: "", limit: "", dueDay: "", closingDay: "", scope: "PERSONAL" });
      reload();
    } catch (e) { setErr(e instanceof Error ? e.message : "Erro"); } finally { setSaving(false); }
  }
  async function remove(c: Card) {
    if (!confirm(`Remover o cartão "${c.name}"? Se houver lançamentos, ele será apenas arquivado.`)) return;
    await api(`/api/cards/${c.id}`, { method: "DELETE" });
    reload();
  }
  async function reactivate(c: Card) {
    await api(`/api/cards/${c.id}`, { method: "PUT", body: { active: true } });
    reload();
  }

  return (
    <div>
      <PageHeader title="Cartões de crédito" subtitle="Limite e dia de vencimento de cada cartão" />
      <form onSubmit={add} className="card mb-6 space-y-5">
        <SectionTitle>Novo cartão</SectionTitle>
        {err && <ErrorBox message={err} />}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="col-span-2">
            <label className="label" htmlFor="cname">Nome</label>
            <input id="cname" className="input" required placeholder="Ex.: BB Venc. dia 08" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="climit">Limite (R$)</label>
            <input id="climit" className="input mono" inputMode="decimal" required value={f.limit} onChange={(e) => setF({ ...f, limit: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="cdue">Dia de vencimento</label>
            <input id="cdue" type="number" min={1} max={31} className="input mono" required value={f.dueDay} onChange={(e) => setF({ ...f, dueDay: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="cclose">Fechamento <span className="text-t4 normal-case tracking-normal">(opc.)</span></label>
            <input id="cclose" type="number" min={1} max={31} className="input mono" value={f.closingDay} onChange={(e) => setF({ ...f, closingDay: e.target.value })} />
          </div>
          <div className="col-span-2">
            <label className="label" htmlFor="cscope">Visibilidade</label>
            <select id="cscope" className="input" value={f.scope} onChange={(e) => setF({ ...f, scope: e.target.value })}>
              <option value="PERSONAL">Pessoal (só eu)</option><option value="FAMILY">Familiar (todos da família)</option>
            </select>
          </div>
        </div>
        <button className="btn-primary" disabled={saving}>{saving ? "Salvando..." : "Adicionar cartão"}</button>
      </form>

      {error && <ErrorBox message={error} />}
      {loading && !data && <Spinner className="my-16" />}
      {data && data.length === 0 && <Empty>Nenhum cartão cadastrado.</Empty>}
      <div className="stagger grid gap-5 sm:grid-cols-2">
        {data?.map((c) => {
          const pct = c.limit ? Math.min(100, Math.round((c.used / c.limit) * 100)) : 0;
          return (
            <div key={c.id} className={`card ${c.active ? "" : "opacity-60"}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-[15px] font-semibold text-white">{c.name}<ScopeBadge scope={c.scope} /></div>
                  <div className="mono mt-1 text-[11px] text-t3">Vence dia {c.dueDay}{c.closingDay ? ` · fecha dia ${c.closingDay}` : ""}{c.active ? "" : " · arquivado"}</div>
                </div>
                {c.active ? <button className="btn-ghost btn-xs hover:!text-danger" onClick={() => remove(c)}>Remover</button> : <button className="btn-ghost btn-xs" onClick={() => reactivate(c)}>Reativar</button>}
              </div>
              <div className="track mt-4">
                <div className={`fill ${pct > 85 ? "fill-danger" : ""}`} style={{ width: `${pct}%` }} />
              </div>
              <div className="mono mt-2 flex justify-between text-[11px] text-t3">
                <span>Em aberto: {brl(c.used)}</span><span>Disponível: {brl(c.available)} de {brl(c.limit)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
