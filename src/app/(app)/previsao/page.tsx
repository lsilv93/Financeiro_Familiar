"use client";
import { useState } from "react";
import { api, brl, fmtMonth, useApi } from "@/lib/client";
import { currentMonthClient } from "@/lib/clientDates";
import { categoryLabel } from "@/lib/categories";
import type { Tx } from "@/lib/types";
import { Empty, ErrorBox, Modal, MonthPicker, PageHeader, ScopeBadge, SectionTitle, Spinner } from "@/components/ui";
import { TransactionList } from "@/components/TransactionList";

type Res = { month: string; items: Tx[]; installmentsTotal: number; totals: { income: number; expense: number; balance: number } };
type Overview = { months: { month: string; income: number; expense: number; balance: number; fixedIncome: number; fixedExpense: number; installmentExpense: number }[] };
type Rule = { id: string; type: "INCOME" | "EXPENSE"; description: string; amount: number; dayOfMonth: number; scope: "PERSONAL" | "FAMILY"; active: boolean; category: string; cardName: string | null; startMonth: string; endMonth: string | null };

const short = (m: string) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString("pt-BR", { month: "short", year: "2-digit", timeZone: "UTC" }).replace(". de ", "/").replace(".", "");

export default function PrevisaoPage() {
  const [month, setMonth] = useState(currentMonthClient());
  const f = useApi<Res>(`/api/forecast?month=${month}`);
  const ov = useApi<Overview>("/api/forecast/overview?months=12");
  const rules = useApi<Rule[]>("/api/recurring");
  const [err, setErr] = useState<string | null>(null);
  const [edit, setEdit] = useState<Rule | null>(null);
  const [newAmount, setNewAmount] = useState("");
  const [del, setDel] = useState<Rule | null>(null);
  const [pause, setPause] = useState<Rule | null>(null);
  const [busy, setBusy] = useState(false);

  const reloadAll = () => { f.reload(); ov.reload(); rules.reload(); };
  async function run(fn: () => Promise<unknown>) {
    setBusy(true); setErr(null);
    try { await fn(); reloadAll(); } catch (e) { setErr(e instanceof Error ? e.message : "Erro"); } finally { setBusy(false); setEdit(null); setDel(null); setPause(null); }
  }
  const maxBar = Math.max(1, ...(ov.data?.months.flatMap((m) => [m.income, m.expense]) ?? [1]));
  const d = f.data;

  return (
    <div>
      <PageHeader title="Previsão" subtitle="Receitas, despesas e saldo de cada mês: fixas, parcelas e variáveis" />
      {(f.error || err) && <ErrorBox message={(f.error || err)!} />}

      <div className="card mb-5">
        <SectionTitle>Próximos 12 meses</SectionTitle>
        {ov.loading && !ov.data ? <Spinner className="my-6" /> : (
          <div className="scroll-x">
            <table className="w-full min-w-[560px] text-[12px]">
              <thead>
                <tr className="kicker text-left"><th className="pb-3 font-semibold">Mês</th><th className="pb-3 text-right font-semibold">Receitas</th><th className="pb-3 text-right font-semibold">Despesas</th><th className="pb-3 text-right font-semibold">Saldo</th><th className="w-[28%] pb-3 pl-4 font-semibold"> </th></tr>
              </thead>
              <tbody className="rows [&>tr]:border-t [&>tr]:border-[var(--groove)]">
                {ov.data?.months.map((m) => (
                  <tr key={m.month} onClick={() => setMonth(m.month)} className={`cursor-pointer transition hover:bg-[var(--hover-tint)] ${m.month === month ? "bg-[var(--hover-tint)]" : ""}`}>
                    <td className="py-2.5 pl-1 font-semibold text-fg">{short(m.month)}</td>
                    <td className="mono py-2.5 text-right text-lime">{brl(m.income)}</td>
                    <td className="mono py-2.5 text-right text-danger">{brl(m.expense)}</td>
                    <td className={`mono py-2.5 text-right font-semibold ${m.balance < 0 ? "text-danger" : "text-fg"}`}>{brl(m.balance)}</td>
                    <td className="py-2.5 pl-4">
                      <div className="track !h-2"><div className="fill" style={{ width: `${(m.income / maxBar) * 100}%` }} /></div>
                      <div className="track mt-1 !h-2"><div className="fill fill-danger" style={{ width: `${(m.expense / maxBar) * 100}%` }} /></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-[11px] text-t4">Toque em um mês para ver os lançamentos. Fixas e parcelas entram sozinhas em cada mês.</p>
      </div>

      <div className="mb-5"><MonthPicker month={month} onChange={setMonth} label={fmtMonth(month)} /></div>
      {f.loading && !d && <Spinner className="my-10" />}
      {d && (
        <div className="space-y-5">
          <div className="stagger grid grid-cols-1 gap-3 min-[520px]:grid-cols-3">
            <div className="card-sm"><div className="kicker mb-2">Receitas</div><div className="well !rounded-[16px] !px-3 !py-2"><div className="mono text-[16px] font-semibold text-lime">{brl(d.totals.income)}</div></div></div>
            <div className="card-sm"><div className="kicker mb-2">Despesas</div><div className="well !rounded-[16px] !px-3 !py-2"><div className="mono text-[16px] font-semibold text-danger">{brl(d.totals.expense)}</div></div></div>
            <div className="card-sm"><div className="kicker mb-2">Saldo do mês</div><div className="well !rounded-[16px] !px-3 !py-2"><div className={`mono text-[16px] font-semibold ${d.totals.balance < 0 ? "text-danger" : "text-fg"}`}>{brl(d.totals.balance)}</div></div></div>
          </div>
          {d.installmentsTotal > 0 && <p className="text-[13px] text-t3">Parcelas já comprometidas neste mês: <b className="mono text-fg">{brl(d.installmentsTotal)}</b></p>}
          <div className="card">
            <SectionTitle>Lançamentos de {fmtMonth(month)}</SectionTitle>
            {d.items.length === 0 ? <Empty>Nada lançado para este mês ainda.</Empty> : <TransactionList items={d.items} onChanged={reloadAll} />}
          </div>
        </div>
      )}

      <div className="card mt-5">
        <SectionTitle>Receitas e despesas fixas</SectionTitle>
        {!rules.data || rules.data.length === 0 ? (
          <Empty>Ao lançar uma receita ou despesa, escolha o tipo “Fixa” para ela se repetir sozinha nos próximos meses.</Empty>
        ) : (
          <ul className="rows">
            {rules.data.map((r) => (
              <li key={r.id} className={`flex flex-wrap items-center justify-between gap-2 py-3.5 text-[13px] ${r.active ? "" : "opacity-50"}`}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><span className="truncate font-semibold text-fg">{r.description}</span><ScopeBadge scope={r.scope} /><span className={`badge ${r.type === "INCOME" ? "badge-lime" : ""}`}>{r.type === "INCOME" ? "Receita" : "Despesa"}</span></div>
                  <div className="mono text-[11px] text-t3">Todo dia {r.dayOfMonth} · {brl(r.amount)} · {categoryLabel(r.type, r.category)}{r.cardName ? ` · ${r.cardName}` : ""} · {r.endMonth ? `até ${short(r.endMonth)}` : "sem data final"}{!r.active ? " · pausada" : ""}</div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button className="btn-ghost btn-xs" onClick={() => { setEdit(r); setNewAmount(String(r.amount).replace(".", ",")); }}>Alterar valor</button>
                  <button className="btn-ghost btn-xs" onClick={() => (r.active ? setPause(r) : run(() => api(`/api/recurring/${r.id}`, { method: "PUT", body: { active: true } })))}>{r.active ? "Pausar" : "Reativar"}</button>
                  <button className="btn-ghost btn-xs hover:!text-danger" onClick={() => setDel(r)}>Excluir</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title="Alterar valor">
        {edit && (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); const v = Number(newAmount.replace(",", ".")); if (!v) return; run(() => api(`/api/recurring/${edit.id}`, { method: "PUT", body: { amount: v } })); }}>
            <h2 className="text-[18px] font-semibold text-fg">Alterar valor de “{edit.description}”</h2>
            <p className="text-[13px] leading-relaxed text-t3">O novo valor vale para este mês (se ainda pendente) e para os próximos meses. Meses já pagos não mudam.</p>
            <input className="input mono" inputMode="decimal" autoFocus value={newAmount} onChange={(e) => setNewAmount(e.target.value)} />
            <div className="flex gap-3"><button type="button" className="btn-secondary flex-1" onClick={() => setEdit(null)}>Cancelar</button><button className="btn-primary flex-1" disabled={busy}>Salvar</button></div>
          </form>
        )}
      </Modal>
      <Modal open={!!pause} onClose={() => setPause(null)} title="Pausar fixa">
        {pause && (
          <div className="space-y-4">
            <h2 className="text-[18px] font-semibold text-fg">Pausar “{pause.description}”?</h2>
            <p className="text-[13px] leading-relaxed text-t3">Os lançamentos dos meses futuros que ainda estão pendentes serão removidos. O mês atual e os anteriores permanecem. Você pode reativar depois.</p>
            <div className="flex gap-3"><button className="btn-secondary flex-1" onClick={() => setPause(null)}>Cancelar</button><button className="btn-danger flex-1" disabled={busy} onClick={() => run(() => api(`/api/recurring/${pause.id}`, { method: "PUT", body: { active: false } }))}>Pausar</button></div>
          </div>
        )}
      </Modal>
      <Modal open={!!del} onClose={() => setDel(null)} title="Excluir fixa">
        {del && (
          <div className="space-y-4">
            <h2 className="text-[18px] font-semibold text-fg">Excluir “{del.description}”?</h2>
            <p className="text-[13px] leading-relaxed text-t3">A regra e os meses futuros pendentes serão removidos. O histórico (meses pagos ou já vencidos) permanece.</p>
            <div className="flex gap-3"><button className="btn-secondary flex-1" onClick={() => setDel(null)}>Cancelar</button><button className="btn-danger flex-1" disabled={busy} onClick={() => run(() => api(`/api/recurring/${del.id}`, { method: "DELETE" }))}>Excluir</button></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
