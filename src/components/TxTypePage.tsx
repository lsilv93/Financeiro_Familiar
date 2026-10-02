"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { brl, fmtMonth, useApi } from "@/lib/client";
import { currentMonthClient } from "@/lib/clientDates";
import type { Tx } from "@/lib/types";
import { Empty, ErrorBox, MonthPicker, PageHeader, ScopeTabs, Spinner } from "./ui";
import { TransactionList } from "./TransactionList";
import { Icon } from "./Icon";

type Res = { items: Tx[]; total: number; totals: { income: number; expense: number; balance: number } };

function Inner({ type }: { type: "INCOME" | "EXPENSE" }) {
  const sp = useSearchParams();
  const isExpense = type === "EXPENSE";
  const [month, setMonth] = useState(/^\d{4}-\d{2}$/.test(sp.get("mes") ?? "") ? sp.get("mes")! : currentMonthClient());
  const [scope, setScope] = useState("ALL");
  const [status, setStatus] = useState("");
  const [saved, setSaved] = useState(sp.get("salvo") === "1");
  const { data, error, loading, reload } = useApi<Res>(`/api/transactions?type=${type}&month=${month}&scope=${scope}&pageSize=100${status ? `&status=${status}` : ""}`);
  const all = useApi<Res>(`/api/transactions?type=${type}&month=${month}&scope=${scope}&pageSize=1`);
  const paid = useApi<Res>(`/api/transactions?type=${type}&month=${month}&scope=${scope}&pageSize=1&status=PAID`);
  const total = isExpense ? all.data?.totals.expense ?? 0 : all.data?.totals.income ?? 0;
  const done = isExpense ? paid.data?.totals.expense ?? 0 : paid.data?.totals.income ?? 0;
  const refresh = () => { reload(); all.reload(); paid.reload(); };
  const color = isExpense ? "text-danger" : "text-lime";

  return (
    <div>
      <PageHeader
        title={isExpense ? "Despesas" : "Receitas"}
        subtitle={isExpense ? "Tudo o que sai: contas, compras e parcelas" : "Tudo o que entra: salário, extras e rendimentos"}
        actions={<Link href={isExpense ? "/despesas/nova" : "/receitas/nova"} className="btn-primary"><Icon name="plus" size={16} />{isExpense ? "Nova despesa" : "Nova receita"}</Link>}
      />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <MonthPicker month={month} onChange={setMonth} label={fmtMonth(month)} />
        <ScopeTabs value={scope} onChange={setScope} />
      </div>

      <div className="stagger mb-5 grid grid-cols-1 gap-3 min-[520px]:grid-cols-3">
        <div className="card-sm"><div className="kicker mb-2">Total do mês</div><div className="well !rounded-[16px] !px-3 !py-2"><div className={`mono text-[16px] font-semibold ${color}`}>{brl(total)}</div></div></div>
        <div className="card-sm"><div className="kicker mb-2">{isExpense ? "Já pago" : "Já recebido"}</div><div className="well !rounded-[16px] !px-3 !py-2"><div className="mono text-[16px] font-semibold text-fg">{brl(done)}</div></div></div>
        <div className="card-sm"><div className="kicker mb-2">{isExpense ? "Falta pagar" : "Falta receber"}</div><div className="well !rounded-[16px] !px-3 !py-2"><div className="mono text-[16px] font-semibold text-gold">{brl(Math.max(0, total - done))}</div></div></div>
      </div>

      <div className="mb-4 seg" role="tablist" aria-label="Filtrar por situação">
        {[["", "Todas"], ["PENDING", isExpense ? "A pagar" : "A receber"], ["PAID", isExpense ? "Pagas" : "Recebidas"]].map(([v, l]) => (
          <button key={v} role="tab" aria-selected={status === v} className="seg-btn" onClick={() => setStatus(v)}>{l}</button>
        ))}
      </div>

      {saved && (
        <div className="well mb-4 flex items-center justify-between gap-3 text-[13px] text-lime" role="status">
          <span className="flex items-center gap-2"><Icon name="check" size={16} />{isExpense ? "Despesa lançada!" : "Receita lançada!"} Ela já entrou no saldo.</span>
          <button className="btn-ghost btn-xs" onClick={() => setSaved(false)}>Ok</button>
        </div>
      )}
      {error && <ErrorBox message={error} />}
      {loading && !data && <Spinner className="my-12" />}
      {data && (
        <div className={`card ${loading ? "opacity-60" : ""}`}>
          {data.items.length === 0 ? (
            <Empty>
              <span>{isExpense ? "Nenhuma despesa neste mês." : "Nenhuma receita neste mês."}</span>
              <Link href={isExpense ? "/despesas/nova" : "/receitas/nova"} className="btn-primary btn-xs">{isExpense ? "Lançar despesa" : "Lançar receita"}</Link>
            </Empty>
          ) : <TransactionList items={data.items} onChanged={refresh} />}
        </div>
      )}
      <p className="mt-4 text-center text-[11px] text-t4">Lançou errado? Toque no lápis para corrigir ou na lixeira para excluir.</p>
    </div>
  );
}

export function TxTypePage({ type }: { type: "INCOME" | "EXPENSE" }) {
  return <Suspense fallback={null}><Inner type={type} /></Suspense>;
}
