"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, brl, todayStr, useApi } from "@/lib/client";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS } from "@/lib/categories";
import type { Card } from "@/lib/types";
import { ErrorBox, Modal } from "./ui";

type Check = { level: "OK" | "RESERVE" | "NEGATIVE"; projectedBefore: number; projectedAfter: number; impact: number; emergencyReserve: number };
type Method = keyof typeof PAYMENT_METHODS;

const seg = (active: boolean, tone = "brand") =>
  `flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${active ? (tone === "red" ? "bg-rose-600 text-white" : "bg-brand-600 text-white") : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`;

export function TransactionForm() {
  const router = useRouter();
  const { data: cards } = useApi<Card[]>("/api/cards");
  const activeCards = useMemo(() => (cards ?? []).filter((c) => c.active), [cards]);

  const [type, setType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [scope, setScope] = useState<"PERSONAL" | "FAMILY">("PERSONAL");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("ALIMENTACAO");
  const [subcategory, setSubcategory] = useState("");
  const [date, setDate] = useState(todayStr());
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState<"PAID" | "PENDING">("PAID");
  const [method, setMethod] = useState<Method>("PIX");
  const [cardId, setCardId] = useState("");
  const [installments, setInstallments] = useState(1);
  const [recurring, setRecurring] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<Check | null>(null);

  const isExpense = type === "EXPENSE";
  const isCredit = isExpense && method === "CREDIT";
  const value = Number(amount.replace(",", ".")) || 0;

  useEffect(() => {
    setCategory(type === "EXPENSE" ? "ALIMENTACAO" : "SALARIO");
    setSubcategory("");
    if (type === "INCOME") { setInstallments(1); setStatus("PAID"); }
  }, [type]);
  useEffect(() => setSubcategory(""), [category]);
  useEffect(() => { if (isCredit) setStatus("PENDING"); }, [isCredit]);
  useEffect(() => { if (isCredit && !cardId && activeCards[0]) setCardId(activeCards[0].id); }, [isCredit, cardId, activeCards]);

  const payload = () => ({
    type, scope, description, amount: value, category,
    subcategory: subcategory || null, date, dueDate: !isCredit && dueDate ? dueDate : null, status,
    paymentMethod: isExpense ? method : null,
    cardId: isCredit ? cardId : null,
    installments: isExpense ? installments : 1,
    recurring: recurring && installments === 1,
  });

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await api("/api/transactions", { method: "POST", body: payload() });
      router.push("/lancamentos");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
      setSaving(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!value) return setError("Informe um valor maior que zero");
    if (isCredit && !cardId) return setError("Escolha qual cartão de crédito foi utilizado");
    if (!isExpense) return save();
    setSaving(true);
    try {
      const p = payload();
      const check = await api<Check>("/api/budget-check", {
        method: "POST",
        body: { scope, amount: p.amount, installments: p.installments, category, subcategory: p.subcategory, date, dueDate: p.dueDate, paymentMethod: method, cardId: p.cardId },
      });
      if (check.level === "OK") return save();
      setAlert(check);
      setSaving(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao validar o orçamento");
      setSaving(false);
    }
  }

  const cats = isExpense ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const subs = isExpense ? EXPENSE_CATEGORIES[category]?.subs ?? [] : [];

  return (
    <>
      <form onSubmit={submit} className="card space-y-4">
        {error && <ErrorBox message={error} />}

        <div className="flex gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          <button type="button" className={seg(isExpense, "red")} onClick={() => setType("EXPENSE")}>Despesa</button>
          <button type="button" className={seg(!isExpense)} onClick={() => setType("INCOME")}>Receita</button>
        </div>

        <div>
          <span className="label">Visibilidade</span>
          <div className="flex gap-2">
            <button type="button" className={seg(scope === "PERSONAL")} onClick={() => setScope("PERSONAL")}>🔒 Pessoal</button>
            <button type="button" className={seg(scope === "FAMILY")} onClick={() => setScope("FAMILY")}>👨‍👩‍👧 Familiar</button>
          </div>
          <p className="mt-1 text-xs text-slate-500">{scope === "PERSONAL" ? "Só você enxerga este lançamento." : "Todos os membros da sua família enxergam este lançamento."}</p>
        </div>

        <div>
          <label className="label" htmlFor="desc">Descrição</label>
          <input id="desc" className="input" required maxLength={120} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={isExpense ? "Ex.: Compras do mês" : "Ex.: Salário de outubro"} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="amount">{installments > 1 ? "Valor total (R$)" : "Valor (R$)"}</label>
            <input id="amount" className="input" inputMode="decimal" required placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="date">{isCredit ? "Data da compra" : isExpense ? "Data" : "Data do recebimento"}</label>
            <input id="date" type="date" className="input" required value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="cat">Categoria</label>
            <select id="cat" className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {Object.entries(cats).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          {subs.length > 0 && (
            <div>
              <label className="label" htmlFor="sub">Subcategoria</label>
              <select id="sub" className="input" value={subcategory} onChange={(e) => setSubcategory(e.target.value)}>
                <option value="">—</option>
                {subs.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          )}
        </div>

        {isExpense && (
          <>
            <div>
              <span className="label">Forma de pagamento</span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(Object.keys(PAYMENT_METHODS) as Method[]).map((m) => (
                  <button type="button" key={m} className={seg(method === m)} onClick={() => setMethod(m)}>{PAYMENT_METHODS[m]}</button>
                ))}
              </div>
            </div>

            {isCredit && (
              <div>
                <label className="label" htmlFor="card">Cartão utilizado <span className="text-red-500">*</span></label>
                {activeCards.length === 0 ? (
                  <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                    Você ainda não tem cartões. <Link className="font-semibold underline" href="/cartoes">Cadastre um cartão</Link> para continuar.
                  </p>
                ) : (
                  <select id="card" className="input" required value={cardId} onChange={(e) => setCardId(e.target.value)}>
                    {activeCards.map((c) => <option key={c.id} value={c.id}>{c.name} · vence dia {c.dueDay}{c.scope === "FAMILY" ? " (familiar)" : ""}</option>)}
                  </select>
                )}
                <p className="mt-1 text-xs text-slate-500">O vencimento é calculado automaticamente pela fatura do cartão.</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="inst">Parcelas</label>
                <input id="inst" type="number" min={1} max={120} className="input" value={installments} onChange={(e) => setInstallments(Math.max(1, Math.min(120, Number(e.target.value) || 1)))} />
                {installments > 1 && value > 0 && <p className="mt-1 text-xs text-slate-500">{installments}x de ≈ {brl(value / installments)}</p>}
              </div>
              {!isCredit && (
                <div>
                  <label className="label" htmlFor="due">Vencimento <span className="text-slate-400">(opcional)</span></label>
                  <input id="due" type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
              )}
            </div>
          </>
        )}

        <div>
          <span className="label">Situação</span>
          <div className="flex gap-2">
            <button type="button" className={seg(status === "PAID")} onClick={() => setStatus("PAID")}>{isExpense ? "Já paguei" : "Já recebi"}</button>
            <button type="button" className={seg(status === "PENDING")} onClick={() => setStatus("PENDING")}>{isExpense ? "A pagar" : "A receber"}</button>
          </div>
          {installments > 1 && <p className="mt-1 text-xs text-slate-500">A situação vale para a 1ª parcela; as demais ficam pendentes até você confirmar cada pagamento.</p>}
        </div>

        {installments === 1 && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} className="h-4 w-4 rounded accent-brand-600" />
            Repetir todo mês ({isExpense ? "gasto fixo" : "receita fixa"}) — alimenta a previsão do próximo mês
          </label>
        )}

        <div className="flex gap-2 pt-2">
          <Link href="/lancamentos" className="btn-secondary flex-1">Cancelar</Link>
          <button className="btn-primary flex-1" disabled={saving}>{saving ? "Salvando..." : "Salvar lançamento"}</button>
        </div>
      </form>

      <Modal open={!!alert} onClose={() => setAlert(null)} title="Alerta de orçamento">
        {alert && (
          <div className="space-y-4">
            <div className="text-4xl" aria-hidden>⚠️</div>
            <h2 className="text-lg font-bold">Alerta de orçamento</h2>
            <p>
              {alert.level === "NEGATIVE"
                ? "Atenção: Este gasto comprometerá seu orçamento mensal"
                : "Atenção: Este gasto comprometerá sua reserva de emergência"}
              . Deseja confirmar mesmo assim?
            </p>
            <dl className="space-y-1 rounded-xl bg-slate-100 p-3 text-sm dark:bg-slate-800">
              <div className="flex justify-between"><dt>Saldo projetado do mês</dt><dd className="tabular-nums">{brl(alert.projectedBefore)}</dd></div>
              <div className="flex justify-between"><dt>Valor deste gasto{installments > 1 ? " (1ª parcela)" : ""}</dt><dd className="tabular-nums">− {brl(alert.impact)}</dd></div>
              <div className="flex justify-between font-semibold"><dt>Saldo após o gasto</dt><dd className={`tabular-nums ${alert.projectedAfter < 0 ? "text-red-600" : ""}`}>{brl(alert.projectedAfter)}</dd></div>
              {alert.emergencyReserve > 0 && <div className="flex justify-between text-slate-500"><dt>Reserva a preservar</dt><dd className="tabular-nums">{brl(alert.emergencyReserve)}</dd></div>}
            </dl>
            <div className="flex gap-2">
              <button className="btn-secondary flex-1" onClick={() => setAlert(null)}>Voltar</button>
              <button className="btn-danger flex-1" disabled={saving} onClick={() => { setAlert(null); save(); }}>Confirmar mesmo assim</button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
