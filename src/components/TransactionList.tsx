"use client";
import { useState } from "react";
import { api, brl, fmtDate, todayStr } from "@/lib/client";
import { PAYMENT_METHODS, categoryLabel } from "@/lib/categories";
import type { Tx } from "@/lib/types";
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
      {err && <div className="mb-2 rounded-xl bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{err}</div>}
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {items.map((t) => {
          const overdue = t.status === "PENDING" && t.type === "EXPENSE" && t.dueDate < today;
          const income = t.type === "INCOME";
          return (
            <li key={t.id} className="flex items-center gap-3 py-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ${income ? "bg-emerald-100 dark:bg-emerald-900/40" : "bg-rose-100 dark:bg-rose-900/40"}`} aria-hidden>
                {income ? "⬆️" : "⬇️"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="truncate font-medium">{t.description}</span>
                  {t.installmentNumber && <span className="badge bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">{t.installmentNumber}/{t.installmentsCount}</span>}
                  {t.recurringMonth && <span className="badge bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">Fixo</span>}
                  <ScopeBadge scope={t.scope} />
                </div>
                <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {categoryLabel(t.type, t.category)}{t.subcategory ? ` · ${t.subcategory}` : ""}
                  {t.paymentMethod ? ` · ${t.paymentMethod === "CREDIT" && t.cardName ? t.cardName : PAYMENT_METHODS[t.paymentMethod]}` : ""}
                </div>
                <div className={`text-xs ${overdue ? "font-semibold text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400"}`}>
                  {overdue ? "Vencida em " : income ? "Data " : "Vence em "}{fmtDate(t.dueDate)}
                  {t.status === "PENDING" ? (income ? " · a receber" : " · pendente") : income ? " · recebido" : " · pago"}
                </div>
              </div>
              <div className="text-right">
                <div className={`font-semibold tabular-nums ${income ? "text-emerald-600 dark:text-emerald-400" : ""}`}>{income ? "+" : "−"} {brl(t.amount)}</div>
                <div className="mt-1 flex justify-end gap-1">
                  <button disabled={busy === t.id} onClick={() => toggle(t)}
                    className={`rounded-lg px-2 py-1 text-xs font-semibold ${t.status === "PAID" ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" : "bg-brand-600 text-white"}`}>
                    {t.status === "PAID" ? "Desfazer" : income ? "Receber" : "Pagar"}
                  </button>
                  <button disabled={busy === t.id} onClick={() => remove(t)} aria-label="Excluir" className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950">🗑</button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
