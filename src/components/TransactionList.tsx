"use client";
import { useState } from "react";
import { api, brl, fmtDate, todayStr } from "@/lib/client";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS, categoryLabel } from "@/lib/categories";
import type { Tx } from "@/lib/types";
import { Icon } from "./Icon";
import { ErrorBox, Modal, ScopeBadge } from "./ui";

type DelMode = "one" | "future" | "all" | "plan";

export function TransactionList({ items, onChanged }: { items: Tx[]; onChanged: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [del, setDel] = useState<Tx | null>(null);
  const [delMode, setDelMode] = useState<DelMode>("one");
  const [edit, setEdit] = useState<Tx | null>(null);
  const [form, setForm] = useState({ description: "", amount: "", date: "", category: "", subcategory: "", status: "PAID" as "PAID" | "PENDING" });
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

  function askDelete(t: Tx) {
    setDel(t);
    setDelMode(t.planId ? "one" : "one");
  }
  async function confirmDelete() {
    if (!del) return;
    const t = del;
    const qs = delMode === "plan" ? "?plan=true" : t.recurringMonth && t.planId == null ? `?mode=${delMode}` : "";
    setDel(null);
    await run(t.id, () => api(`/api/transactions/${t.id}${qs}`, { method: "DELETE" }));
  }

  function openEdit(t: Tx) {
    setErr(null);
    setEdit(t);
    setForm({ description: t.description, amount: String(t.amount).replace(".", ","), date: t.dueDate, category: t.category, subcategory: t.subcategory ?? "", status: t.status });
  }
  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!edit) return;
    const t = edit;
    const amount = Number(form.amount.replace(",", "."));
    if (!amount || amount <= 0) return setErr("Informe um valor maior que zero");
    const credit = t.paymentMethod === "CREDIT";
    const body: Record<string, unknown> = { description: form.description, amount, category: form.category, subcategory: form.subcategory || null, status: form.status };
    if (credit && !t.planId) body.date = form.date;
    else { body.dueDate = form.date; if (!credit && !t.planId && !t.recurringMonth) body.date = form.date; }
    setEdit(null);
    await run(t.id, () => api(`/api/transactions/${t.id}`, { method: "PUT", body }));
  }

  const cats = edit?.type === "INCOME" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const subs = edit?.type === "EXPENSE" ? EXPENSE_CATEGORIES[form.category]?.subs ?? [] : [];

  return (
    <div>
      {err && !edit && <ErrorBox message={err} />}
      <ul className="rows">
        {items.map((t) => {
          const overdue = t.status === "PENDING" && t.type === "EXPENSE" && t.dueDate < today;
          const income = t.type === "INCOME";
          return (
            <li key={t.id} className="flex items-center gap-3 py-3.5">
              <div className={`chip ${income ? "text-lime" : "text-danger"}`}><Icon name={income ? "up" : "down"} size={18} /></div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="truncate text-[14px] font-semibold text-fg">{t.description}</span>
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
                <div className={`mono text-[14px] font-semibold ${income ? "text-lime" : "text-fg"}`}>{income ? "+" : "−"} {brl(t.amount)}</div>
                <div className="mt-1.5 flex items-center justify-end gap-0.5">
                  <button disabled={busy === t.id} onClick={() => toggle(t)} className={`btn-xs ${t.status === "PAID" ? "btn-secondary" : "btn-primary"} btn`}>
                    {t.status === "PAID" ? "Desfazer" : income ? "Receber" : "Pagar"}
                  </button>
                  <button disabled={busy === t.id} onClick={() => openEdit(t)} aria-label={`Editar ${t.description}`} title="Editar" className="btn-ghost !min-h-[36px] !px-2"><Icon name="edit" size={16} /></button>
                  <button disabled={busy === t.id} onClick={() => askDelete(t)} aria-label={`Excluir ${t.description}`} title="Excluir" className="btn-ghost !min-h-[36px] !px-2 hover:!text-danger"><Icon name="trash" size={16} /></button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* exclusão com confirmação */}
      <Modal open={!!del} onClose={() => setDel(null)} title="Excluir lançamento">
        {del && (
          <div className="space-y-4">
            <span className="chip !h-12 !w-12 !rounded-[18px] text-danger"><Icon name="trash" size={22} /></span>
            <h2 className="text-[18px] font-semibold text-fg">Excluir {del.type === "INCOME" ? "esta receita" : "esta despesa"}?</h2>
            <div className="well text-[13px] text-t2">
              <div className="font-semibold text-fg">{del.description}</div>
              <div className="mono mt-1">{del.type === "INCOME" ? "+" : "−"} {brl(del.amount)} · {fmtDate(del.dueDate)}</div>
            </div>
            {del.planId && (
              <div className="seg w-full !flex-col !rounded-[22px] sm:!flex-row" role="radiogroup">
                <button type="button" role="radio" aria-checked={delMode === "one"} className={`seg-btn ${delMode === "one" ? "on-danger" : ""}`} onClick={() => setDelMode("one")}>Só esta parcela ({del.installmentNumber}/{del.installmentsCount})</button>
                <button type="button" role="radio" aria-checked={delMode === "plan"} className={`seg-btn ${delMode === "plan" ? "on-danger" : ""}`} onClick={() => setDelMode("plan")}>Todas as parcelas</button>
              </div>
            )}
            {del.recurringMonth && !del.planId && (
              <div className="seg w-full !flex-col !rounded-[22px]" role="radiogroup">
                <button type="button" role="radio" aria-checked={delMode === "one"} className={`seg-btn ${delMode === "one" ? "on-danger" : ""}`} onClick={() => setDelMode("one")}>Só este mês</button>
                <button type="button" role="radio" aria-checked={delMode === "future"} className={`seg-btn ${delMode === "future" ? "on-danger" : ""}`} onClick={() => setDelMode("future")}>Este e os próximos meses</button>
                <button type="button" role="radio" aria-checked={delMode === "all"} className={`seg-btn ${delMode === "all" ? "on-danger" : ""}`} onClick={() => setDelMode("all")}>Todos os meses (apaga a fixa)</button>
              </div>
            )}
            {del.status === "PAID" && <p className="text-[12px] leading-relaxed text-gold">Este lançamento está marcado como {del.type === "INCOME" ? "recebido" : "pago"}: o saldo será recalculado sem ele.</p>}
            <p className="text-[12px] text-t4">Esta ação não pode ser desfeita.</p>
            <div className="flex flex-col gap-3 sm:flex-row-reverse">
              <button className="btn-secondary flex-1" onClick={() => setDel(null)}>Cancelar</button>
              <button className="btn-danger flex-1" onClick={confirmDelete}>Sim, excluir</button>
            </div>
          </div>
        )}
      </Modal>

      {/* edição */}
      <Modal open={!!edit} onClose={() => setEdit(null)} title="Editar lançamento">
        {edit && (
          <form onSubmit={saveEdit} className="space-y-4">
            <h2 className="text-[18px] font-semibold text-fg">Editar {edit.type === "INCOME" ? "receita" : "despesa"}</h2>
            {err && <ErrorBox message={err} />}
            {(edit.planId || edit.recurringMonth) && <p className="text-[12px] text-t4">A alteração vale só para este lançamento{edit.recurringMonth ? ". Para mudar o valor dos próximos meses, use Previsão → Alterar valor" : ""}.</p>}
            <div><label className="label" htmlFor="ed">Descrição</label><input id="ed" className="input" required maxLength={120} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label" htmlFor="ea">Valor (R$)</label><input id="ea" className="input mono" inputMode="decimal" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
              <div><label className="label" htmlFor="edt">{edit.paymentMethod === "CREDIT" && !edit.planId ? "Data da compra" : "Data"}</label><input id="edt" type="date" className="input mono" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="label" htmlFor="ec">Categoria</label><select id="ec" className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value, subcategory: "" })}>{Object.entries(cats).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
              {subs.length > 0 && <div><label className="label" htmlFor="es">Subcategoria</label><select id="es" className="input" value={form.subcategory} onChange={(e) => setForm({ ...form, subcategory: e.target.value })}><option value="">—</option>{subs.map((s) => <option key={s}>{s}</option>)}</select></div>}
            </div>
            <div className="seg w-full">
              <button type="button" className={`seg-btn ${form.status === "PAID" ? "on" : ""}`} onClick={() => setForm({ ...form, status: "PAID" })}>{edit.type === "INCOME" ? "Recebido" : "Pago"}</button>
              <button type="button" className={`seg-btn ${form.status === "PENDING" ? "on" : ""}`} onClick={() => setForm({ ...form, status: "PENDING" })}>{edit.type === "INCOME" ? "A receber" : "A pagar"}</button>
            </div>
            <div className="flex gap-3"><button type="button" className="btn-secondary flex-1" onClick={() => setEdit(null)}>Cancelar</button><button className="btn-primary flex-1">Salvar</button></div>
          </form>
        )}
      </Modal>
    </div>
  );
}
