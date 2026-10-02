"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, brl, todayStr, useApi } from "@/lib/client";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS } from "@/lib/categories";
import type { Card } from "@/lib/types";
import { ErrorBox, Modal } from "./ui";
import { Icon } from "./Icon";

type Check = { level: "OK" | "RESERVE" | "NEGATIVE"; projectedBefore: number; projectedAfter: number; impact: number; emergencyReserve: number };
type Method = keyof typeof PAYMENT_METHODS;

function shiftDay(d: string, n: number) {
  const x = new Date(`${d}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
}
function monthName(d: string) {
  const m = new Date(`${d.slice(0, 7)}-01T00:00:00Z`).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
  return m.charAt(0).toUpperCase() + m.slice(1);
}

const seg = (active: boolean, tone = "brand") => `seg-btn ${active ? (tone === "red" ? "on-danger" : "on") : ""}`;

export function TransactionForm({ fixedType }: { fixedType: "INCOME" | "EXPENSE" }) {
  const router = useRouter();
  const { data: cards } = useApi<Card[]>("/api/cards");
  const activeCards = useMemo(() => (cards ?? []).filter((c) => c.active), [cards]);

  const type = fixedType; // receita e despesa têm telas separadas (evita lançar no lugar errado)
  const [scope, setScope] = useState<"PERSONAL" | "FAMILY">("PERSONAL");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(fixedType === "EXPENSE" ? "ALIMENTACAO" : "SALARIO");
  const [subcategory, setSubcategory] = useState("");
  const [date, setDate] = useState(todayStr());
  const [dueDate, setDueDate] = useState("");
  const [status, setStatusRaw] = useState<"PAID" | "PENDING">("PAID");
  const [statusTouched, setStatusTouched] = useState(false);
  const setStatus = (v: "PAID" | "PENDING") => { setStatusTouched(true); setStatusRaw(v); };
  const [method, setMethod] = useState<Method>("PIX");
  const [cardId, setCardId] = useState("");
  const [kind, setKind] = useState<"VARIABLE" | "FIXED" | "INSTALLMENT">("VARIABLE");
  const [installments, setInstallments] = useState(2);
  const [repeatMonths, setRepeatMonths] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<Check | null>(null);

  const isExpense = type === "EXPENSE";
  const isCredit = isExpense && method === "CREDIT";
  const value = Number(amount.replace(",", ".")) || 0;
  const nInst = isExpense && kind === "INSTALLMENT" ? installments : 1;

  // Data futura => "a pagar/a receber"; hoje ou passada => já realizado (o usuário pode trocar).
  useEffect(() => {
    if (!statusTouched && !isCredit) setStatusRaw(date > todayStr() ? "PENDING" : "PAID");
  }, [date, statusTouched, isCredit]);
  useEffect(() => setSubcategory(""), [category]);
  useEffect(() => { if (isCredit) setStatusRaw("PENDING"); }, [isCredit]);
  useEffect(() => { if (isCredit && !cardId && activeCards[0]) setCardId(activeCards[0].id); }, [isCredit, cardId, activeCards]);

  const payload = () => ({
    type, scope, description, amount: value, category,
    subcategory: subcategory || null, date, dueDate: !isCredit && dueDate ? dueDate : null, status,
    paymentMethod: isExpense ? method : null,
    cardId: isCredit ? cardId : null,
    installments: nInst,
    recurring: kind === "FIXED",
    repeatMonths: kind === "FIXED" && repeatMonths ? Number(repeatMonths) : null,
  });

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await api("/api/transactions", { method: "POST", body: payload() });
      router.push(`${isExpense ? "/despesas" : "/receitas"}?mes=${date.slice(0, 7)}&salvo=1`);
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
        body: { scope, amount: p.amount, installments: nInst, category, subcategory: p.subcategory, date, dueDate: p.dueDate, paymentMethod: method, cardId: p.cardId },
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
      <form onSubmit={submit} className="card space-y-6 !p-6">
        {error && <ErrorBox message={error} />}

        <div className={`well flex items-center gap-3 ${isExpense ? "well-danger" : ""}`}>
          <span className={`chip ${isExpense ? "text-danger" : "text-lime"}`}><Icon name={isExpense ? "down" : "up"} size={18} /></span>
          <div>
            <div className={`text-[15px] font-semibold ${isExpense ? "text-danger-light" : "text-lime"}`}>{isExpense ? "Nova despesa" : "Nova receita"}</div>
            <div className="text-[11px] text-t3">{isExpense ? "Dinheiro que sai: contas, compras, parcelas." : "Dinheiro que entra: salário, extras, rendimentos."}</div>
          </div>
        </div>

        <div>
          <span className="label">Visibilidade</span>
          <div className="seg w-full">
            <button type="button" className={seg(scope === "PERSONAL")} onClick={() => setScope("PERSONAL")}>Pessoal</button>
            <button type="button" className={seg(scope === "FAMILY")} onClick={() => setScope("FAMILY")}>Familiar</button>
          </div>
          <p className="mt-2 text-[11px] text-t4">{scope === "PERSONAL" ? "Só você enxerga este lançamento." : "Todos os membros da sua família enxergam este lançamento."}</p>
        </div>

        <div>
          <span className="label">Tipo de {isExpense ? "despesa" : "receita"}</span>
          <div className="seg w-full" role="radiogroup" aria-label="Tipo de lançamento">
            <button type="button" role="radio" aria-checked={kind === "VARIABLE"} className={seg(kind === "VARIABLE")} onClick={() => setKind("VARIABLE")}>Variável</button>
            <button type="button" role="radio" aria-checked={kind === "FIXED"} className={seg(kind === "FIXED")} onClick={() => setKind("FIXED")}>Fixa</button>
            {isExpense && <button type="button" role="radio" aria-checked={kind === "INSTALLMENT"} className={seg(kind === "INSTALLMENT")} onClick={() => setKind("INSTALLMENT")}>Parcelada</button>}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-t4">
            {kind === "VARIABLE" && `Vale só para o mês deste lançamento. Não se repete nos meses seguintes.`}
            {kind === "FIXED" && `Replica automaticamente para os próximos meses (${isExpense ? "ex.: aluguel, internet" : "ex.: salário"}). Você pode pausar ou alterar o valor depois, em Previsão.`}
            {kind === "INSTALLMENT" && `Informe quantas parcelas: o sistema lança uma parcela por mês, nos meses seguintes.`}
          </p>
        </div>

        <div>
          <label className="label" htmlFor="desc">Descrição</label>
          <input id="desc" className="input" required maxLength={120} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={isExpense ? "Ex.: Compras do mês" : "Ex.: Salário de outubro"} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="amount">{nInst > 1 ? "Valor total (R$)" : "Valor (R$)"}</label>
            <input id="amount" className="input mono" inputMode="decimal" required placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="date">{isCredit ? "Data da compra" : isExpense ? "Data" : "Data do recebimento"}</label>
            <input id="date" type="date" className="input mono" required value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <div className="-mt-3 space-y-2">
          <div className="flex flex-wrap gap-2">
            {[["Hoje", 0], ["Ontem", -1], ["Amanhã", 1]].map(([l, d]) => (
              <button key={l as string} type="button" className="btn-secondary btn-xs" onClick={() => setDate(shiftDay(todayStr(), d as number))}>{l}</button>
            ))}
          </div>
          <p className="text-[11px] leading-relaxed text-t4">
            Pode ser qualquer dia, mês ou ano: passado (se esqueceu de lançar) ou futuro.
            {date && <> Entra em <b className="text-t2">{monthName(date)}</b>.</>}
          </p>
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
              <div className="seg grid w-full grid-cols-2 !rounded-[26px] sm:grid-cols-4 sm:!rounded-full">
                {(Object.keys(PAYMENT_METHODS) as Method[]).map((m) => (
                  <button type="button" key={m} className={seg(method === m)} onClick={() => setMethod(m)}>{PAYMENT_METHODS[m]}</button>
                ))}
              </div>
            </div>

            {isCredit && (
              <div>
                <label className="label" htmlFor="card">Cartão utilizado <span className="text-danger">*</span></label>
                {activeCards.length === 0 ? (
                  <p className="well-gold text-[13px] text-gold">
                    Você ainda não tem cartões. <Link className="font-semibold underline hover:text-lime" href="/cartoes">Cadastre um cartão</Link> para continuar.
                  </p>
                ) : (
                  <select id="card" className="input" required value={cardId} onChange={(e) => setCardId(e.target.value)}>
                    {activeCards.map((c) => <option key={c.id} value={c.id}>{c.name} · vence dia {c.dueDay}{c.scope === "FAMILY" ? " (familiar)" : ""}</option>)}
                  </select>
                )}
                <p className="mt-2 text-[11px] text-t4">O vencimento é calculado automaticamente pela fatura do cartão.</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {kind === "INSTALLMENT" && (
                <div>
                  <label className="label" htmlFor="inst">Quantidade de parcelas</label>
                  <input id="inst" type="number" min={2} max={120} className="input mono" value={installments} onChange={(e) => setInstallments(Math.max(2, Math.min(120, Number(e.target.value) || 2)))} />
                  {value > 0 && <p className="mono mt-2 text-[11px] text-t4">{installments}x de ≈ {brl(value / installments)}</p>}
                </div>
              )}
              {!isCredit && (
                <div>
                  <label className="label" htmlFor="due">Vencimento <span className="text-t4 normal-case tracking-normal">(opcional)</span></label>
                  <input id="due" type="date" className="input mono" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
              )}
            </div>
          </>
        )}

        <div>
          <span className="label">Situação</span>
          <div className="seg w-full">
            <button type="button" className={seg(status === "PAID")} onClick={() => setStatus("PAID")}>{isExpense ? "Já paguei" : "Já recebi"}</button>
            <button type="button" className={seg(status === "PENDING")} onClick={() => setStatus("PENDING")}>{isExpense ? "A pagar" : "A receber"}</button>
          </div>
          {nInst > 1 && <p className="mt-2 text-[11px] text-t4">A situação vale para a 1ª parcela; as demais ficam pendentes até você confirmar cada pagamento.</p>}
        </div>

        {kind === "FIXED" && (
          <div>
            <label className="label" htmlFor="rep">Repetir por quantos meses? <span className="text-t4 normal-case tracking-normal">(vazio = sem data final)</span></label>
            <input id="rep" type="number" min={1} max={120} className="input mono" placeholder="Ex.: 12" value={repeatMonths} onChange={(e) => setRepeatMonths(e.target.value.replace(/\D/g, "").slice(0, 3))} />
            <p className="mt-2 text-[11px] text-t4">Os meses seguintes entram como {isExpense ? "“a pagar”" : "“a receber”"} e já aparecem na previsão e no saldo de cada mês.</p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Link href="/lancamentos" className="btn-secondary flex-1">Cancelar</Link>
          <button className="btn-primary flex-1" disabled={saving}>{saving ? "Salvando..." : "Salvar lançamento"}</button>
        </div>
      </form>

      <Modal open={!!alert} onClose={() => setAlert(null)} title="Alerta de orçamento">
        {alert && (
          <div className="space-y-4">
            <div className="chip !h-12 !w-12 !rounded-[18px] text-gold"><Icon name="alert" size={24} /></div>
            <h2 className="text-[18px] font-semibold text-fg">Alerta de orçamento</h2>
            <p className="text-[14px] leading-relaxed text-t2">
              {alert.level === "NEGATIVE"
                ? "Atenção: Este gasto comprometerá seu orçamento mensal"
                : "Atenção: Este gasto comprometerá sua reserva de emergência"}
              . Deseja confirmar mesmo assim?
            </p>
            <dl className="well-gold space-y-1.5 text-[13px] text-t2 [&_dt]:text-gold-label">
              <div className="flex justify-between"><dt>Saldo projetado do mês</dt><dd className="mono">{brl(alert.projectedBefore)}</dd></div>
              <div className="flex justify-between"><dt>Valor deste gasto{nInst > 1 ? " (1ª parcela)" : ""}</dt><dd className="mono">− {brl(alert.impact)}</dd></div>
              <div className="flex justify-between font-semibold text-fg"><dt>Saldo após o gasto</dt><dd className={`mono ${alert.projectedAfter < 0 ? "text-danger" : "text-fg"}`}>{brl(alert.projectedAfter)}</dd></div>
              {alert.emergencyReserve > 0 && <div className="flex justify-between text-t3"><dt>Reserva a preservar</dt><dd className="mono">{brl(alert.emergencyReserve)}</dd></div>}
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
