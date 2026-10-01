"use client";
import { useState } from "react";
import Link from "next/link";
import { brl, fmtMonth, useApi } from "@/lib/client";
import { currentMonthClient } from "@/lib/clientDates";
import { DonutChart } from "@/components/DonutChart";
import { ErrorBox, MonthPicker, PageHeader, ScopeTabs, Spinner } from "@/components/ui";

type Dash = {
  totals: { received: number; spent: number; balance: number; projected: number; incomeTotal: number; expenseTotal: number; pendingExpenses: number };
  invested: { paid: number; planned: number };
  tithes: { paid: number; planned: number };
  categories: { key: string; label: string; color: string; total: number; percent: number }[];
  topCategory: { label: string; total: number; percent: number; color: string } | null;
  overdue: { count: number; total: number };
  upcoming: { count: number; total: number };
  emergencyReserve: number;
  reserveAtRisk: "OK" | "RESERVE" | "NEGATIVE";
};

function Stat({ label, value, tone, hint }: { label: string; value: number; tone?: "good" | "bad" | "neutral"; hint?: string }) {
  const color = tone === "good" ? "text-emerald-600 dark:text-emerald-400" : tone === "bad" ? "text-rose-600 dark:text-rose-400" : "";
  return (
    <div className="card">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
      <div className={`mt-1 text-xl font-bold tabular-nums sm:text-2xl ${color}`}>{brl(value)}</div>
      {hint && <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{hint}</div>}
    </div>
  );
}

export default function PainelPage() {
  const [month, setMonth] = useState(currentMonthClient());
  const [scope, setScope] = useState("ALL");
  const { data, error, loading } = useApi<Dash>(`/api/dashboard?month=${month}&scope=${scope}`);

  return (
    <div>
      <PageHeader title="Painel" subtitle="Visão geral das suas finanças" />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <MonthPicker month={month} onChange={setMonth} label={fmtMonth(month)} />
        <ScopeTabs value={scope} onChange={setScope} />
      </div>

      {error && <ErrorBox message={error} />}
      {loading && !data && <Spinner className="my-10" />}
      {data && (
        <div className={`space-y-4 ${loading ? "opacity-60" : ""}`}>
          {data.overdue.count > 0 && (
            <Link href="/atrasos" className="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
              <span>🚨 <b>{data.overdue.count}</b> {data.overdue.count === 1 ? "conta vencida" : "contas vencidas"} · {brl(data.overdue.total)}</span>
              <span className="text-sm font-semibold">Ver →</span>
            </Link>
          )}
          {data.overdue.count === 0 && data.upcoming.count > 0 && (
            <Link href="/atrasos" className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
              <span>⏳ <b>{data.upcoming.count}</b> {data.upcoming.count === 1 ? "conta vence" : "contas vencem"} nos próximos 7 dias · {brl(data.upcoming.total)}</span>
              <span className="text-sm font-semibold">Ver →</span>
            </Link>
          )}
          {data.reserveAtRisk !== "OK" && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
              {data.reserveAtRisk === "NEGATIVE"
                ? "⚠️ A projeção do mês está negativa: as despesas previstas superam os rendimentos."
                : `⚠️ A projeção do mês ficou abaixo da sua reserva de emergência (${brl(data.emergencyReserve)}).`}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Total recebido" value={data.totals.received} tone="good" hint={`Previsto: ${brl(data.totals.incomeTotal)}`} />
            <Stat label="Total gasto" value={data.totals.spent} tone="bad" hint={`A pagar: ${brl(data.totals.pendingExpenses)}`} />
            <Stat label="Saldo atual" value={data.totals.balance} tone={data.totals.balance >= 0 ? "good" : "bad"} hint="Recebido − gasto" />
            <Stat label="Projeção fim do mês" value={data.totals.projected} tone={data.totals.projected >= 0 ? "good" : "bad"} hint="Rendimentos − despesas previstas" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="card">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">📈 Investido no mês</div>
              <div className="mt-1 text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{brl(data.invested.paid)}</div>
              {data.invested.planned > data.invested.paid && <div className="text-xs text-slate-500">Previsto: {brl(data.invested.planned)}</div>}
            </div>
            <div className="card">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">🙏 Dízimos e doações</div>
              <div className="mt-1 text-xl font-bold tabular-nums text-amber-600 dark:text-amber-400">{brl(data.tithes.paid)}</div>
              {data.tithes.planned > data.tithes.paid && <div className="text-xs text-slate-500">Previsto: {brl(data.tithes.planned)}</div>}
            </div>
          </div>

          {data.topCategory && (
            <div className="card flex items-center gap-3 border-l-4" style={{ borderLeftColor: data.topCategory.color }}>
              <div className="text-3xl" aria-hidden>🔥</div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Maior gasto do mês</div>
                <div className="font-bold">{data.topCategory.label}</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">{brl(data.topCategory.total)} · {data.topCategory.percent.toFixed(0)}% das despesas</div>
              </div>
            </div>
          )}

          <div className="card">
            <h2 className="mb-3 font-semibold">Despesas por categoria</h2>
            {data.categories.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">Nenhuma despesa neste mês.</p>
            ) : (
              <DonutChart data={data.categories} total={data.totals.expenseTotal} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
