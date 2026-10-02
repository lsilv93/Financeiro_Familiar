"use client";
import { useEffect, useMemo, useState } from "react";
import { api, brl, fmtDate, todayStr, useApi } from "@/lib/client";
import { addDaysStr, periodLabel, rangeOf, shiftRef, type Period } from "@/lib/clientDates";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS } from "@/lib/categories";
import type { Tx } from "@/lib/types";
import { Icon } from "@/components/Icon";
import { Empty, ErrorBox, Modal, PageHeader, ScopeTabs, Spinner } from "@/components/ui";

type Res = { items: Tx[]; total: number };
const PERIODS: [Period, string][] = [["day", "Dia"], ["week", "Semana"], ["month", "Mês"], ["year", "Ano"]];

/** Célula de texto/número/data que grava ao sair do campo (Enter confirma, Esc volta). */
function Cell({ value, type = "text", align, label, onCommit, className = "" }: { value: string; type?: "text" | "money" | "date"; align?: "right"; label: string; onCommit: (v: string) => void; className?: string }) {
  const money = type === "money";
  const show = (x: string) => (money ? Number(x).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : x);
  const [v, setV] = useState(show(value));
  const [focus, setFocus] = useState(false);
  useEffect(() => { if (!focus) setV(show(value)); }, [value, focus]); // eslint-disable-line react-hooks/exhaustive-deps
  const commit = () => {
    setFocus(false);
    if (money) {
      const n = Number(v.replace(/\./g, "").replace(",", "."));
      if (Number.isFinite(n) && n > 0 && n !== Number(value)) onCommit(String(n)); else setV(show(value));
    } else if (v !== value && v !== "") onCommit(v); else setV(value);
  };
  return (
    <input
      aria-label={label}
      type={money ? "text" : type}
      inputMode={money ? "decimal" : undefined}
      value={v}
      className={`h-9 w-full rounded-lg bg-transparent px-2 text-[13px] text-fg outline-none transition hover:bg-[var(--hover-tint)] focus:bg-[var(--hover-tint)] focus:shadow-[0_0_0_2px_var(--focus-ring)] ${align === "right" ? "mono text-right" : ""} ${type !== "text" ? "mono" : ""} ${className}`}
      onChange={(e) => setV(e.target.value)}
      onFocus={(e) => { setFocus(true); if (money) { setV(String(value).replace(".", ",")); e.target.select(); } }}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") { setV(show(value)); (e.target as HTMLInputElement).blur(); } }}
    />
  );
}

export default function PlanilhaPage() {
  const [period, setPeriod] = useState<Period>("month");
  const [ref, setRef] = useState(todayStr());
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [scope, setScope] = useState("ALL");
  const [q, setQ] = useState("");
  const { from, to } = rangeOf(period, ref);
  const url = `/api/transactions?from=${from}&to=${to}&scope=${scope}&sort=asc&pageSize=500${type ? `&type=${type}` : ""}${status ? `&status=${status}` : ""}${q.trim() ? `&q=${encodeURIComponent(q.trim())}` : ""}`;
  const { data, error, loading, reload } = useApi<Res>(url);

  const [rows, setRows] = useState<Tx[]>([]);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [flash, setFlash] = useState<Record<string, "ok" | string>>({});
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [postpone, setPostpone] = useState<string[] | null>(null);
  const [pickDate, setPickDate] = useState("");
  const [delIds, setDelIds] = useState<string[] | null>(null);
  const today = todayStr();

  useEffect(() => { if (data) { setRows(data.items); setSel(new Set()); } }, [data]);

  const mark = (id: string, v: "ok" | string) => { setFlash((f) => ({ ...f, [id]: v })); setTimeout(() => setFlash((f) => { const n = { ...f }; delete n[id]; return n; }), v === "ok" ? 1400 : 4000); };

  async function patch(t: Tx, body: Record<string, unknown>) {
    setErr(null);
    try {
      const upd = await api<Tx>(`/api/transactions/${t.id}`, { method: "PUT", body });
      setRows((rs) => rs.map((r) => (r.id === t.id ? { ...r, ...upd } : r)));
      mark(t.id, "ok");
    } catch (e) { mark(t.id, e instanceof Error ? e.message : "Erro"); reload(); }
  }

  async function bulk(ids: string[], action: "pay" | "unpay" | "postpone" | "delete", extra: Record<string, unknown> = {}) {
    setErr(null); setMsg(null);
    try {
      const r = await api<{ updated: number }>("/api/transactions/bulk", { method: "POST", body: { ids, action, ...extra } });
      setMsg(action === "delete" ? `${r.updated} linha(s) excluída(s).` : action === "postpone" ? `${r.updated} vencimento(s) adiado(s).` : `${r.updated} linha(s) atualizada(s).`);
      reload();
    } catch (e) { setErr(e instanceof Error ? e.message : "Erro"); }
  }

  const visible = useMemo(() => rows, [rows]);
  const totals = useMemo(() => {
    const t = { inc: 0, exp: 0, incPaid: 0, expPaid: 0 };
    for (const r of visible) { if (r.type === "INCOME") { t.inc += r.amount; if (r.status === "PAID") t.incPaid += r.amount; } else { t.exp += r.amount; if (r.status === "PAID") t.expPaid += r.amount; } }
    return t;
  }, [visible]);
  const allSel = visible.length > 0 && visible.every((r) => sel.has(r.id));
  const toggleAll = () => setSel(allSel ? new Set() : new Set(visible.map((r) => r.id)));
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const picked = [...sel];
  const isCurrent = shiftRef(period, ref, 0) === shiftRef(period, today, 0);

  return (
    <div>
      <PageHeader title="Planilha" subtitle="Veja e atualize tudo em uma tabela: situação, valores, datas e adiamentos" />

      <div className="card mb-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="seg" role="tablist" aria-label="Período">{PERIODS.map(([p, l]) => <button key={p} role="tab" aria-selected={period === p} className="seg-btn" onClick={() => { setPeriod(p); setRef(today); }}>{l}</button>)}</div>
          <ScopeTabs value={scope} onChange={setScope} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="seg items-center">
            <button aria-label="Período anterior" className="seg-btn !flex-none !px-4" onClick={() => setRef(shiftRef(period, ref, -1))}>‹</button>
            <span className="min-w-[10rem] text-center text-[13px] font-semibold text-fg">{periodLabel(period, ref, { start: from, end: to })}</span>
            <button aria-label="Próximo período" className="seg-btn !flex-none !px-4" onClick={() => setRef(shiftRef(period, ref, 1))}>›</button>
          </div>
          {!isCurrent && <button className="btn-ghost btn-xs" onClick={() => setRef(today)}>Voltar para hoje</button>}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="seg w-full">{[["", "Tudo"], ["INCOME", "Receitas"], ["EXPENSE", "Despesas"]].map(([v, l]) => <button key={v} className={`seg-btn ${type === v ? "on" : ""}`} onClick={() => setType(v)}>{l}</button>)}</div>
          <div className="seg w-full">{[["", "Todas"], ["PENDING", "Pendentes"], ["PAID", "Pagas"]].map(([v, l]) => <button key={v} className={`seg-btn ${status === v ? "on" : ""}`} onClick={() => setStatus(v)}>{l}</button>)}</div>
          <input aria-label="Buscar" className="input" placeholder="Buscar descrição..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {(error || err) && <ErrorBox message={(error || err)!} />}
      {msg && <div className="well mb-3 text-[13px] text-lime" role="status">{msg}</div>}

      {picked.length > 0 && (
        <div className="card sticky top-2 z-20 mb-3 flex flex-wrap items-center justify-between gap-3 !rounded-[22px] !p-3">
          <span className="text-[13px] text-t2"><b className="mono text-fg">{picked.length}</b> {picked.length === 1 ? "linha selecionada" : "linhas selecionadas"}</span>
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary btn-xs" onClick={() => bulk(picked, "pay")}>Marcar como pagas</button>
            <button className="btn-secondary btn-xs" onClick={() => bulk(picked, "unpay")}>Marcar como pendentes</button>
            <button className="btn-secondary btn-xs" onClick={() => { setPostpone(picked); setPickDate(""); }}>Adiar vencimento</button>
            <button className="btn-ghost btn-xs hover:!text-danger" onClick={() => setDelIds(picked)}>Excluir</button>
          </div>
        </div>
      )}

      {loading && !data && <Spinner className="my-12" />}
      {data && (
        <div className={`card !p-0 ${loading ? "opacity-60" : ""}`}>
          {visible.length === 0 ? <div className="p-5"><Empty>Nenhuma linha neste período com esses filtros.</Empty></div> : (
            <div className="scroll-x" tabIndex={0} role="region" aria-label="Planilha de lançamentos">
              <table className="w-full min-w-[900px] border-collapse text-[13px]">
                <thead>
                  <tr className="kicker text-left">
                    <th className="w-10 px-3 py-3"><input type="checkbox" className="check" aria-label="Selecionar todas as linhas" checked={allSel} onChange={toggleAll} /></th>
                    <th className="w-[120px] px-2 py-3 font-semibold">Situação</th>
                    <th className="w-[140px] px-2 py-3 font-semibold">Vencimento</th>
                    <th className="w-[150px] px-2 py-3 font-semibold">Tipo</th>
                    <th className="min-w-[230px] px-2 py-3 font-semibold">Descrição</th>
                    <th className="w-[170px] px-2 py-3 font-semibold">Categoria</th>
                    <th className="hidden w-[120px] px-2 py-3 font-semibold xl:table-cell">Pagamento</th>
                    <th className="w-[130px] px-2 py-3 text-right font-semibold">Valor (R$)</th>
                    <th className="w-[96px] px-2 py-3 font-semibold"><span className="sr-only">Ações</span></th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((t) => {
                    const income = t.type === "INCOME";
                    const overdue = t.status === "PENDING" && !income && t.dueDate < today;
                    const cats = income ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
                    const fl = flash[t.id];
                    return (
                      <tr key={t.id} className={`border-t border-[var(--groove)] ${sel.has(t.id) ? "bg-[var(--hover-tint)]" : ""} ${t.status === "PAID" ? "" : "shadow-[inset_3px_0_0_var(--gold)]"}`}>
                        <td className="px-3 py-1.5"><input type="checkbox" className="check" aria-label={`Selecionar ${t.description}`} checked={sel.has(t.id)} onChange={() => toggle(t.id)} /></td>
                        <td className="px-2 py-1.5">
                          <button aria-label={`${t.description}: ${t.status === "PAID" ? "marcar como pendente" : income ? "marcar como recebido" : "marcar como pago"}`} onClick={() => patch(t, { status: t.status === "PAID" ? "PENDING" : "PAID" })}
                            className={`badge !px-3 !py-1.5 transition ${t.status === "PAID" ? "badge-lime" : overdue ? "badge-danger" : "badge-gold"}`}>
                            {t.status === "PAID" ? (income ? "Recebido" : "Pago") : overdue ? "Vencida" : income ? "A receber" : "Pendente"}
                          </button>
                        </td>
                        <td className="px-1 py-1.5"><Cell label={`Vencimento de ${t.description}`} type="date" value={t.dueDate} onCommit={(v) => patch(t, { dueDate: v })} className={overdue ? "!text-danger" : ""} /></td>
                        <td className="px-2 py-1.5"><div className="flex flex-wrap items-center gap-1"><span className={`badge ${income ? "badge-lime" : "badge-danger"}`}>{income ? "Receita" : "Despesa"}</span>{t.installmentNumber && <span className="badge badge-lime mono">{t.installmentNumber}/{t.installmentsCount}</span>}{t.recurringMonth && <span className="badge badge-gold">Fixo</span>}</div></td>
                        <td className="px-1 py-1.5">
                          <Cell label={`Descrição de ${t.description}`} value={t.description} onCommit={(v) => patch(t, { description: v })} />
                        </td>
                        <td className="px-1 py-1.5">
                          <select aria-label={`Categoria de ${t.description}`} className="h-9 w-full rounded-lg bg-transparent px-2 text-[13px] text-fg outline-none hover:bg-[var(--hover-tint)] focus:shadow-[0_0_0_2px_var(--focus-ring)]" value={t.category}
                            onChange={(e) => patch(t, { category: e.target.value, subcategory: null })}>
                            {Object.entries(cats).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                          </select>
                        </td>
                        <td className="hidden px-2 py-1.5 text-t3 xl:table-cell">{t.paymentMethod ? (t.paymentMethod === "CREDIT" && t.cardName ? t.cardName : PAYMENT_METHODS[t.paymentMethod]) : "—"}</td>
                        <td className="px-1 py-1.5"><Cell label={`Valor de ${t.description}`} type="money" align="right" value={String(t.amount)} onCommit={(v) => patch(t, { amount: Number(v) })} className={`min-w-[112px] ${income ? "!text-lime" : ""}`} /></td>
                        <td className="px-2 py-1.5">
                          <div className="flex items-center justify-end gap-0.5">
                            {fl === "ok" && <span className="mr-1 text-lime" role="status" title="Salvo"><Icon name="check" size={16} /></span>}
                            {fl && fl !== "ok" && <span className="mr-1 max-w-[120px] truncate text-[11px] text-danger" title={fl}>{fl}</span>}
                            <button className="btn-ghost !min-h-[34px] !px-2 text-[11px]" title="Adiar vencimento" onClick={() => { setPostpone([t.id]); setPickDate(t.dueDate); }}>Adiar</button>
                            <button className="btn-ghost !min-h-[34px] !px-2 hover:!text-danger" aria-label={`Excluir ${t.description}`} onClick={() => setDelIds([t.id])}><Icon name="trash" size={15} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[var(--groove)] text-[12px]">
                    <td colSpan={5} className="px-3 py-3 text-t3">{visible.length} linha(s){data.total > visible.length ? ` de ${data.total} (mostrando as primeiras ${visible.length}; refine o período)` : ""}</td>
                    <td colSpan={4} className="px-3 py-3">
                      <div className="mono flex flex-wrap justify-end gap-x-5 gap-y-1">
                        <span className="text-lime">Receitas {brl(totals.inc)}</span>
                        <span className="text-danger">Despesas {brl(totals.exp)}</span>
                        <span className={`font-semibold ${totals.inc - totals.exp < 0 ? "text-danger" : "text-fg"}`}>Saldo {brl(totals.inc - totals.exp)}</span>
                      </div>
                      <div className="mono mt-1 text-right text-[11px] text-t4">já realizado: + {brl(totals.incPaid)} · − {brl(totals.expPaid)}</div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
      <p className="mt-3 text-center text-[11px] text-t4">Edite direto nas células (Enter salva, Esc cancela). Toque na situação para alternar pago/pendente. Marque várias linhas para atualizar de uma vez.</p>

      <Modal open={!!postpone} onClose={() => setPostpone(null)} title="Adiar vencimento">
        {postpone && (
          <div className="space-y-4">
            <h2 className="text-[18px] font-semibold text-fg">Adiar {postpone.length === 1 ? "este vencimento" : `${postpone.length} vencimentos`}</h2>
            <div className="grid grid-cols-2 gap-2">
              {[["+1 dia", { days: 1 }], ["+3 dias", { days: 3 }], ["+7 dias", { days: 7 }], ["+15 dias", { days: 15 }], ["+1 mês", { months: 1 }], ["+2 meses", { months: 2 }]].map(([l, x]) => (
                <button key={l as string} className="btn-secondary" onClick={() => { const ids = postpone; setPostpone(null); bulk(ids, "postpone", x as Record<string, unknown>); }}>{l as string}</button>
              ))}
            </div>
            <div><label className="label" htmlFor="pd">Ou escolha uma data</label>
              <div className="flex gap-2"><input id="pd" type="date" className="input mono" min={addDaysStr(today, -3650)} value={pickDate} onChange={(e) => setPickDate(e.target.value)} /><button className="btn-primary" disabled={!pickDate} onClick={() => { const ids = postpone; setPostpone(null); bulk(ids, "postpone", { date: pickDate }); }}>Aplicar</button></div>
            </div>
            <p className="text-[11px] text-t4">O adiamento muda o vencimento (e o mês em que o valor entra no saldo). Parcelas e fixas mudam só a linha escolhida.</p>
          </div>
        )}
      </Modal>
      <Modal open={!!delIds} onClose={() => setDelIds(null)} title="Excluir linhas">
        {delIds && (
          <div className="space-y-4">
            <span className="chip !h-12 !w-12 !rounded-[18px] text-danger"><Icon name="trash" size={22} /></span>
            <h2 className="text-[18px] font-semibold text-fg">Excluir {delIds.length === 1 ? "esta linha" : `${delIds.length} linhas`}?</h2>
            <p className="text-[13px] leading-relaxed text-t3">O saldo será recalculado sem {delIds.length === 1 ? "ela" : "elas"}. Em fixas e parcelas, só a(s) linha(s) escolhida(s) são removidas. Não dá para desfazer.</p>
            <div className="flex flex-col gap-3 sm:flex-row-reverse"><button className="btn-danger flex-1" onClick={() => { const ids = delIds; setDelIds(null); bulk(ids, "delete"); }}>Sim, excluir</button><button className="btn-secondary flex-1" onClick={() => setDelIds(null)}>Cancelar</button></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
