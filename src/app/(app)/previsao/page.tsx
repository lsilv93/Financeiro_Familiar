"use client";
import { useState } from "react";
import { api, brl, fmtMonth, shiftMonth, useApi } from "@/lib/client";
import { currentMonthClient } from "@/lib/clientDates";
import { categoryLabel } from "@/lib/categories";
import type { Tx } from "@/lib/types";
import { Empty, ErrorBox, MonthPicker, PageHeader, ScopeBadge, SectionTitle, Spinner } from "@/components/ui";
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
      <div className="mb-6"><MonthPicker month={month} onChange={setMonth} label={fmtMonth(month)} /></div>
      {(f.error || err) && <ErrorBox message={(f.error || err)!} />}
      {f.loading && !d && <Spinner className="my-16" />}
      {d && (
        <div className="space-y-5">
          <div className="stagger grid grid-cols-1 gap-3 min-[520px]:grid-cols-3">
            <div className="card-sm"><div className="kicker mb-2">Receitas previstas</div><div className="well !rounded-[16px] !px-3 !py-2"><div className="mono text-[16px] font-semibold text-lime">{brl(d.totals.income)}</div></div></div>
            <div className="card-sm"><div className="kicker mb-2">Despesas previstas</div><div className="well !rounded-[16px] !px-3 !py-2"><div className="mono text-[16px] font-semibold text-danger">{brl(d.totals.expense)}</div></div></div>
            <div className="card-sm"><div className="kicker mb-2">Saldo previsto</div><div className="well !rounded-[16px] !px-3 !py-2"><div className={`mono text-[16px] font-semibold ${d.totals.balance < 0 ? "text-danger" : "text-white"}`}>{brl(d.totals.balance)}</div></div></div>
          </div>
          {d.installmentsTotal > 0 && <p className="text-[13px] text-t3">Parcelas já comprometidas neste mês: <b className="mono text-white">{brl(d.installmentsTotal)}</b></p>}

          {d.pendingRules.length > 0 && (
            <div className="card">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-t3">Fixos ainda não lançados ({d.pendingRules.length})</h2>
                <button className="btn-primary btn-xs" onClick={generate} disabled={busy}>{busy ? "Gerando..." : "Gerar lançamentos do mês"}</button>
              </div>
              {msg && <p className="mb-2 text-[13px] text-lime">{msg}</p>}
              <ul className="well rows text-[13px]">
                {d.pendingRules.map((r) => (
                  <li key={r.id} className="flex items-center justify-between py-2.5 text-white">
                    <span>{r.description} <span className="text-[11px] text-t3">· dia {r.dayOfMonth} · {categoryLabel(r.type, r.category)}</span></span>
                    <span className={`mono ${r.type === "INCOME" ? "text-lime" : "text-white"}`}>{r.type === "INCOME" ? "+" : "−"} {brl(r.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="card">
            <SectionTitle>Lançamentos do mês</SectionTitle>
            {d.items.length === 0 ? <Empty>Nada lançado para este mês ainda.</Empty> : <TransactionList items={d.items} onChanged={reloadAll} />}
          </div>
        </div>
      )}

      <div className="card mt-5">
        <SectionTitle>Regras de recorrência</SectionTitle>
        {!rules.data || rules.data.length === 0 ? (
          <Empty>Marque “Repetir todo mês” ao criar um lançamento para cadastrar um gasto ou receita fixa.</Empty>
        ) : (
          <ul className="rows">
            {rules.data.map((r) => (
              <li key={r.id} className={`flex items-center justify-between gap-2 py-3 text-[13px] ${r.active ? "" : "opacity-50"}`}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2"><span className="truncate font-semibold text-white">{r.description}</span><ScopeBadge scope={r.scope} /></div>
                  <div className="mono text-[11px] text-t3">Todo dia {r.dayOfMonth} · {brl(r.amount)}{r.cardName ? ` · ${r.cardName}` : ""}</div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button className="btn-ghost btn-xs" onClick={() => toggle(r)}>{r.active ? "Pausar" : "Ativar"}</button>
                  <button className="btn-ghost btn-xs hover:!text-danger" onClick={() => remove(r)}>Excluir</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
