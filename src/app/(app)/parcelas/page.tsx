"use client";
import { useState } from "react";
import { api, brl, fmtDate, useApi } from "@/lib/client";
import { categoryLabel } from "@/lib/categories";
import { Empty, ErrorBox, PageHeader, ScopeBadge, Spinner } from "@/components/ui";
import { Icon } from "@/components/Icon";

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
        <label className="flex items-center gap-3 text-[13px] text-t2"><input type="checkbox" className="check" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} />Mostrar quitadas</label>
      } />
      {error && <ErrorBox message={error} />}
      {loading && !data && <Spinner className="my-16" />}
      {data && list.length === 0 && <Empty>Nenhuma compra parcelada. Ao lançar uma despesa, informe o número de parcelas.</Empty>}
      <div className="stagger space-y-5">
        {list.map((p) => {
          const pct = Math.round((p.paidCount / p.installmentsCount) * 100);
          return (
            <div key={p.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2"><h2 className="text-[15px] font-semibold text-fg">{p.description}</h2><ScopeBadge scope={p.scope} /></div>
                  <div className="mt-0.5 text-[12px] text-t3">{categoryLabel("EXPENSE", p.category)}{p.cardName ? ` · ${p.cardName}` : ""}</div>
                </div>
                <div className="text-right">
                  <div className="kicker">Saldo restante</div>
                  <div className="mono mt-1 text-[20px] font-semibold text-fg">{brl(p.remainingAmount)}</div>
                </div>
              </div>

              <div className="mt-3">
                <div className="mono mb-2 flex justify-between text-[11px] text-t3">
                  <span>{p.paidCount}/{p.installmentsCount} pagas · faltam {p.remainingCount}</span><span>{pct}%</span>
                </div>
                <div className="track" role="progressbar" aria-label={`Progresso de ${p.description}`} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                  <div className="fill" style={{ width: `${pct}%` }} />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                {p.done ? <span className="badge badge-lime"><Icon name="check" size={12} />Quitada</span> : p.next && (
                  <div className="text-[13px] text-t2">
                    Próxima: <b>{p.next.number}/{p.installmentsCount}</b> · {brl(p.next.amount)} · vence {fmtDate(p.next.dueDate)}
                    {p.overdueCount > 0 && <span className="badge badge-danger ml-2">{p.overdueCount} em atraso</span>}
                  </div>
                )}
                <div className="flex gap-2">
                  {p.next && <button className="btn-primary btn-xs" disabled={busy === p.next.id} onClick={() => pay(p.next!.id, true)}>Pagar parcela {p.next.number}</button>}
                  <button className="btn-secondary btn-xs" onClick={() => setOpen(open === p.id ? null : p.id)}>{open === p.id ? "Ocultar" : "Detalhes"}</button>
                </div>
              </div>

              {open === p.id && (
                <ul className="well rows mt-4 text-[13px]">
                  {p.installments.map((i) => (
                    <li key={i.id} className="flex items-center justify-between py-2.5 text-t2">
                      <span>{i.number}/{p.installmentsCount} · {fmtDate(i.dueDate)}</span>
                      <span className="flex items-center gap-3">
                        <span className="mono text-fg">{brl(i.amount)}</span>
                        <button disabled={busy === i.id} onClick={() => pay(i.id, i.status !== "PAID")}
                          className={`btn btn-xs ${i.status === "PAID" ? "btn-ghost !text-lime" : i.overdue ? "btn-danger" : "btn-secondary"}`}>
                          {i.status === "PAID" ? "Paga" : i.overdue ? "Pagar (atrasada)" : "Pagar"}
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
