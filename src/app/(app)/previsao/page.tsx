"use client";
import { useState } from "react";
import { api, brl, fmtMonth, shiftMonth, useApi } from "@/lib/client";
import { currentMonthClient } from "@/lib/clientDates";
import { categoryLabel } from "@/lib/categories";
import type { Tx } from "@/lib/types";
import { Empty, ErrorBox, MonthPicker, PageHeader, ScopeBadge, Spinner } from "@/components/ui";
import { TransactionList } from "@/components/TransactionList";

type Res = {
  month: string; items: Tx[]; installmentsTotal: number;
  pendingRules: { id: string; type: "INCOME" | "EXPENSE"; description: string; amount: number; dayOfMonth: number; category: string; scope: "PERSONAL" | "FAMILY" }[];
  totals: { income: number; expense: number; balance: number };
};
type Rule = { id: string; type: "INCOME" | "EXPENSE"; description: string; amount: number; dayOfMonth: number; scope: "PERSONAL" | "FAMILY"; active: boolean; category: string; cardName: string | null };

export default function PrevisaoPage() {
  const [month, setMonth] = useState(shiftMonth(currentMonthClient(), 1));
  const f = useApi<Res>(`/api/forecast?month=${month}`);
  const rules = useApi<Rule[]>("/api/recurring");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const reloadAll = () => { f.reload(); rules.reload(); };

  async function generate() {
    setBusy(true); setErr(null); setMsg(null);
    try {
      const r = await api<{ generated: number; skipped: number }>("/api/recurring/generate", { method: "POST", body: { month } });
      setMsg(`${r.generated} lançamento(s) gerado(s)${r.skipped ? `, ${r.skipped} já existia(m)` : ""}.`);
      reloadAll();
    } catch (e) { setErr(e instanceof Error ? e.message : "Erro"); } finally { setBusy(false); }
  }
  async function toggle(r: Rule) {
    await api(`/api/recurring/${r.id}`, { method: "PUT", body: { active: !r.active } });
    reloadAll();
  }
  async function remove(r: Rule) {
    if (!confirm(`Excluir a regra fixa "${r.description}"? Lançamentos já gerados permanecem.`)) return;
    await api(`/api/recurring/${r.id}`, { method: "DELETE" });
    reloadAll();
  }

  const d = f.data;
  return (
    <div>
      <PageHeader title="Previsão do mês" subtitle="Gastos fixos, parcelas e recorrências planejados" />
      <div className="mb-4"><MonthPicker month={month} onChange={setMonth} label={fmtMonth(month)} /></div>
      {(f.error || err) && <ErrorBox message={(f.error || err)!} />}
      {f.loading && !d && <Spinner className="my-10" />}
      {d && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="card !p-3"><div className="text-xs text-slate-500">Receitas previstas</div><div className="font-bold text-emerald-600 dark:text-emerald-400">{brl(d.totals.income)}</div></div>
            <div className="card !p-3"><div className="text-xs text-slate-500">Despesas previstas</div><div className="font-bold text-rose-600 dark:text-rose-400">{brl(d.totals.expense)}</div></div>
            <div className="card !p-3"><div className="text-xs text-slate-500">Saldo previsto</div><div className={`font-bold ${d.totals.balance < 0 ? "text-rose-600" : ""}`}>{brl(d.totals.balance)}</div></div>
          </div>
          {d.installmentsTotal > 0 && <p className="text-sm text-slate-500">Parcelas já comprometidas neste mês: <b>{brl(d.installmentsTotal)}</b></p>}

          {d.pendingRules.length > 0 && (
            <div className="card border-amber-200 dark:border-amber-900">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold">Fixos ainda não lançados ({d.pendingRules.length})</h2>
                <button className="btn-primary !py-1.5" onClick={generate} disabled={busy}>{busy ? "Gerando..." : "Gerar lançamentos do mês"}</button>
              </div>
              {msg && <p className="mb-2 text-sm text-emerald-600">{msg}</p>}
              <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
                {d.pendingRules.map((r) => (
                  <li key={r.id} className="flex items-center justify-between py-2">
                    <span>{r.description} <span className="text-xs text-slate-500">· dia {r.dayOfMonth} · {categoryLabel(r.type, r.category)}</span></span>
                    <span className={`tabular-nums ${r.type === "INCOME" ? "text-emerald-600" : ""}`}>{r.type === "INCOME" ? "+" : "−"} {brl(r.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="card">
            <h2 className="mb-2 font-semibold">Lançamentos do mês</h2>
            {d.items.length === 0 ? <Empty>Nada lançado para este mês ainda.</Empty> : <TransactionList items={d.items} onChanged={reloadAll} />}
          </div>
        </div>
      )}

      <div className="card mt-4">
        <h2 className="mb-2 font-semibold">Regras de recorrência</h2>
        {!rules.data || rules.data.length === 0 ? (
          <Empty>Marque “Repetir todo mês” ao criar um lançamento para cadastrar um gasto ou receita fixa.</Empty>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {rules.data.map((r) => (
              <li key={r.id} className={`flex items-center justify-between gap-2 py-2 text-sm ${r.active ? "" : "opacity-50"}`}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2"><span className="truncate font-medium">{r.description}</span><ScopeBadge scope={r.scope} /></div>
                  <div className="text-xs text-slate-500">Todo dia {r.dayOfMonth} · {brl(r.amount)}{r.cardName ? ` · ${r.cardName}` : ""}</div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button className="btn-ghost text-xs" onClick={() => toggle(r)}>{r.active ? "Pausar" : "Ativar"}</button>
                  <button className="btn-ghost text-xs text-red-600" onClick={() => remove(r)}>Excluir</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
