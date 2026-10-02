"use client";
import { useState } from "react";
import { api, brl, fmtDate, todayStr } from "@/lib/client";
import { PAYMENT_METHODS, categoryLabel } from "@/lib/categories";
import type { Tx } from "@/lib/types";
import { Icon } from "./Icon";
import { ScopeBadge } from "./ui";

export function TransactionList({ items, onChanged }: { items: Tx[]; onChanged: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const today = todayStr();

  async function run(id: string, fn: () => Promise<unknown>) {
    setBusy(id);
    setErr(null);
    try {
      await fn();
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(null);
    }
  }

  const toggle = (t: Tx) => run(t.id, () => api(`/api/transactions/${t.id}/pay`, { method: "POST", body: { paid: t.status !== "PAID" } }));
  const remove = (t: Tx) => {
    if (!confirm(`Excluir "${t.description}"?`)) return;
    const plan = !!t.planId && confirm("Este lançamento é parcelado. Excluir TODAS as parcelas? (OK = todas / Cancelar = só esta)");
    run(t.id, () => api(`/api/transactions/${t.id}${plan ? "?plan=true" : ""}`, { method: "DELETE" }));
  };

  return (
    <div>
      {err && <div className="well-danger mb-2 text-[13px] text-danger-light">{err}</div>}
      <ul className="rows">
        {items.map((t) => {
          const overdue = t.status === "PENDING" && t.type === "EXPENSE" && t.dueDate < today;
          const income = t.type === "INCOME";
          return (
            <li key={t.id} className="flex items-center gap-3 py-3.5">
              <div className={`chip ${income ? "text-lime" : "text-danger"}`}><Icon name={income ? "up" : "down"} size={18} /></div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="truncate text-[14px] font-semibold text-white">{t.description}</span>
                  {t.installmentNumber && <span className="badge badge-lime mono">{t.installmentNumber}/{t.installmentsCount}</span>}
                  {t.recurringMonth && <span className="badge badge-gold">Fixo</span>}
                  <ScopeBadge scope={t.scope} />
                </div>
                <div className="mt-0.5 truncate text-[12px] text-t3">
                  {categoryLabel(t.type, t.category)}{t.subcategory ? ` · ${t.subcategory}` : ""}
                  {t.paymentMethod ? ` · ${t.paymentMethod === "CREDIT" && t.cardName ? t.cardName : PAYMENT_METHODS[t.paymentMethod]}` : ""}
                </div>
                <div className={`mt-0.5 text-[11px] ${overdue ? "font-semibold text-danger" : "text-t4"}`}>
                  {overdue ? "Vencida em " : income ? "Data " : "Vence em "}{fmtDate(t.dueDate)}
                  {t.status === "PENDING" ? (income ? " · a receber" : " · pendente") : income ? " · recebido" : " · pago"}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className={`mono text-[14px] font-semibold ${income ? "text-lime" : "text-white"}`}>{income ? "+" : "−"} {brl(t.amount)}</div>
                <div className="mt-1.5 flex items-center justify-end gap-1">
                  <button disabled={busy === t.id} onClick={() => toggle(t)} className={`btn-xs ${t.status === "PAID" ? "btn-secondary" : "btn-primary"} btn`}>
                    {t.status === "PAID" ? "Desfazer" : income ? "Receber" : "Pagar"}
                  </button>
                  <button disabled={busy === t.id} onClick={() => remove(t)} aria-label="Excluir" className="btn-ghost !min-h-[32px] !px-2 hover:!text-danger"><Icon name="trash" size={16} /></button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
