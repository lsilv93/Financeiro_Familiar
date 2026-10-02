"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { brl, fmtMonth, useApi } from "@/lib/client";
import { currentMonthClient } from "@/lib/clientDates";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS } from "@/lib/categories";
import type { Tx } from "@/lib/types";
import { Empty, ErrorBox, MonthPicker, PageHeader, ScopeTabs, Spinner } from "@/components/ui";
import { TransactionList } from "@/components/TransactionList";

type Res = { items: Tx[]; total: number; page: number; pageSize: number; totals: { income: number; expense: number; balance: number } };

export default function ExtratoPage() {
  const [mode, setMode] = useState<"month" | "range">("month");
  const [month, setMonth] = useState(currentMonthClient());
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [scope, setScope] = useState("ALL");
  const [method, setMethod] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const url = useMemo(() => {
    const p = new URLSearchParams({ scope, page: String(page) });
    if (mode === "month") p.set("month", month);
    else { if (from) p.set("from", from); if (to) p.set("to", to); }
    if (method) p.set("method", method);
    if (type) p.set("type", type);
    if (status) p.set("status", status);
    if (category) p.set("category", category);
    if (q.trim()) p.set("q", q.trim());
    return `/api/transactions?${p}`;
  }, [mode, month, from, to, scope, method, type, status, category, q, page]);

  const { data, error, loading, reload } = useApi<Res>(url);
  const reset = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(1); };
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const allCats = { ...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES };

  return (
    <div>
      <PageHeader title="Extrato" subtitle="Receitas e despesas com filtros" actions={<Link href="/lancamentos/novo" className="btn-primary hidden sm:inline-flex">Novo lançamento</Link>} />

      <div className="card mb-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {mode === "month" ? <MonthPicker month={month} onChange={reset(setMonth)} label={fmtMonth(month)} /> : (
            <div className="flex items-center gap-2">
              <input type="date" aria-label="De" className="input mono !w-auto" value={from} onChange={(e) => reset(setFrom)(e.target.value)} />
              <span className="text-t3">até</span>
              <input type="date" aria-label="Até" className="input mono !w-auto" value={to} onChange={(e) => reset(setTo)(e.target.value)} />
            </div>
          )}
          <button className="btn-ghost btn-xs" onClick={() => setMode(mode === "month" ? "range" : "month")}>{mode === "month" ? "Escolher período" : "Filtrar por mês"}</button>
        </div>
        <ScopeTabs value={scope} onChange={reset(setScope)} />
        <div className="grid grid-cols-1 gap-3 min-[520px]:grid-cols-2 lg:grid-cols-4">
          <select aria-label="Tipo" className="input" value={type} onChange={(e) => reset(setType)(e.target.value)}>
            <option value="">Receitas e despesas</option><option value="INCOME">Receitas</option><option value="EXPENSE">Despesas</option>
          </select>
          <select aria-label="Meio de pagamento" className="input" value={method} onChange={(e) => reset(setMethod)(e.target.value)}>
            <option value="">Todos os meios</option>
            {Object.entries(PAYMENT_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select aria-label="Situação" className="input" value={status} onChange={(e) => reset(setStatus)(e.target.value)}>
            <option value="">Qualquer situação</option><option value="PAID">Pagos/recebidos</option><option value="PENDING">Pendentes</option>
          </select>
          <select aria-label="Categoria" className="input" value={category} onChange={(e) => reset(setCategory)(e.target.value)}>
            <option value="">Todas as categorias</option>
            {Object.entries(allCats).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <input aria-label="Buscar" className="input" placeholder="Buscar por descrição..." value={q} onChange={(e) => reset(setQ)(e.target.value)} />
      </div>

      {data && (
        <div className="stagger mb-5 grid grid-cols-1 gap-3 min-[520px]:grid-cols-3">
          <div className="card-sm"><div className="kicker mb-2">Receitas</div><div className="well !rounded-[16px] !px-3 !py-2"><div className="mono text-[16px] font-semibold text-lime">{brl(data.totals.income)}</div></div></div>
          <div className="card-sm"><div className="kicker mb-2">Despesas</div><div className="well !rounded-[16px] !px-3 !py-2"><div className="mono text-[16px] font-semibold text-danger">{brl(data.totals.expense)}</div></div></div>
          <div className="card-sm"><div className="kicker mb-2">Saldo</div><div className="well !rounded-[16px] !px-3 !py-2"><div className="mono text-[16px] font-semibold text-fg">{brl(data.totals.balance)}</div></div></div>
        </div>
      )}

      {error && <ErrorBox message={error} />}
      {loading && !data && <Spinner className="my-10" />}
      {data && (
        <div className={`card ${loading ? "opacity-60" : ""}`}>
          {data.items.length === 0 ? <Empty>Nenhum lançamento encontrado para este filtro.</Empty> : <TransactionList items={data.items} onChanged={reload} />}
          {pages > 1 && (
            <div className="groove mt-3 flex items-center justify-between pt-4">
              <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</button>
              <span className="text-[12px] text-t3">Página {page} de {pages}</span>
              <button className="btn-secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>Próxima</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
