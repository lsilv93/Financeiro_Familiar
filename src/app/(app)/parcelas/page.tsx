"use client";
import { useState } from "react";
import { api, brl, fmtDate, useApi } from "@/lib/client";
import { categoryLabel } from "@/lib/categories";
import { Empty, ErrorBox, PageHeader, ScopeBadge, Spinner } from "@/components/ui";

type Plan = {
  id: string; description: string; scope: "PERSONAL" | "FAMILY"; category: string; cardName: string | null;
  totalAmount: number; installmentsCount: number; paidCount: number; remainingCount: number;
  paidAmount: number; remainingAmount: number; done: boolean; overdueCount: number;
  next: { id: string; number: number; amount: number; dueDate: string } | null;
  installments: { id: string; number: number; amount: number; dueDate: string; status: "PAID" | "PENDING"; overdue: boolean }[];
};

export default function ParcelasPage() {
  const { data, error, loading, reload } = useApi<Plan[]>("/api/installments");
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);

  async function pay(id: string, paid: boolean) {
    setBusy(id);
    try { await api(`/api/transactions/${id}/pay`, { method: "POST", body: { paid } }); await reload(); } finally { setBusy(null); }
  }

  const list = (data ?? []).filter((p) => showDone || !p.done);
  return (
    <div>
      <PageHeader title="Parcelas" subtitle="Compras parceladas e financiamentos" actions={
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-brand-600" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} />Mostrar quitadas</label>
      } />
      {error && <ErrorBox message={error} />}
      {loading && !data && <Spinner className="my-10" />}
      {data && list.length === 0 && <Empty>Nenhuma compra parcelada. Ao lançar uma despesa, informe o número de parcelas.</Empty>}
      <div className="space-y-3">
        {list.map((p) => {
          const pct = Math.round((p.paidCount / p.installmentsCount) * 100);
          return (
            <div key={p.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2"><h2 className="font-semibold">{p.description}</h2><ScopeBadge scope={p.scope} /></div>
                  <div className="text-xs text-slate-500">{categoryLabel("EXPENSE", p.category)}{p.cardName ? ` · ${p.cardName}` : ""}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">Saldo restante</div>
                  <div className="text-lg font-bold tabular-nums">{brl(p.remainingAmount)}</div>
                </div>
              </div>

              <div className="mt-3">
                <div className="mb-1 flex justify-between text-xs text-slate-500">
                  <span>{p.paidCount}/{p.installmentsCount} pagas · faltam {p.remainingCount}</span><span>{pct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                {p.done ? <span className="badge bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">✓ Quitada</span> : p.next && (
                  <div className="text-sm">
                    Próxima: <b>{p.next.number}/{p.installmentsCount}</b> · {brl(p.next.amount)} · vence {fmtDate(p.next.dueDate)}
                    {p.overdueCount > 0 && <span className="badge ml-2 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">{p.overdueCount} em atraso</span>}
                  </div>
                )}
                <div className="flex gap-2">
                  {p.next && <button className="btn-primary !py-1.5" disabled={busy === p.next.id} onClick={() => pay(p.next!.id, true)}>Pagar parcela {p.next.number}</button>}
                  <button className="btn-secondary !py-1.5" onClick={() => setOpen(open === p.id ? null : p.id)}>{open === p.id ? "Ocultar" : "Detalhes"}</button>
                </div>
              </div>

              {open === p.id && (
                <ul className="mt-3 divide-y divide-slate-100 text-sm dark:divide-slate-800">
                  {p.installments.map((i) => (
                    <li key={i.id} className="flex items-center justify-between py-2">
                      <span>{i.number}/{p.installmentsCount} · {fmtDate(i.dueDate)}</span>
                      <span className="flex items-center gap-3">
                        <span className="tabular-nums">{brl(i.amount)}</span>
                        <button disabled={busy === i.id} onClick={() => pay(i.id, i.status !== "PAID")}
                          className={`rounded-lg px-2 py-1 text-xs font-semibold ${i.status === "PAID" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : i.overdue ? "bg-red-600 text-white" : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"}`}>
                          {i.status === "PAID" ? "✓ Paga" : i.overdue ? "Pagar (atrasada)" : "Pagar"}
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
