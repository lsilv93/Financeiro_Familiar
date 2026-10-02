"use client";
import { useState } from "react";
import Link from "next/link";
import { brl, fmtMonth, useApi } from "@/lib/client";
import { currentMonthClient } from "@/lib/clientDates";
import { DonutChart } from "@/components/DonutChart";
import { Icon } from "@/components/Icon";
import { ErrorBox, MonthPicker, PageHeader, ScopeTabs, SectionTitle, Spinner } from "@/components/ui";

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

function Kpi({ label, value, tone, hint, size = "lg" }: { label: string; value: number; tone?: "good" | "bad" | "plain" | "gold"; hint?: string; size?: "lg" | "md" }) {
  const color = tone === "good" ? "text-lime" : tone === "bad" ? "text-danger" : tone === "gold" ? "text-gold" : "text-white";
  return (
    <div className="card !p-[18px]">
      <div className="kicker mb-3">{label}</div>
      <div className="well !rounded-[18px] !px-4 !py-3">
        <div className={`mono truncate font-semibold ${color} ${size === "lg" ? "text-[22px]" : "text-[20px]"}`}>{brl(value)}</div>
      </div>
      {hint && <div className="mt-2.5 text-[11px] text-t4">{hint}</div>}
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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <MonthPicker month={month} onChange={setMonth} label={fmtMonth(month)} />
        <ScopeTabs value={scope} onChange={setScope} />
      </div>

      {error && <ErrorBox message={error} />}
      {loading && !data && <Spinner className="my-16" />}
      {data && (
        <div className={`space-y-5 transition-opacity ${loading ? "opacity-60" : ""}`}>
          {data.overdue.count > 0 && (
            <Link href="/atrasos" className="well-danger card-link flex items-center justify-between gap-3">
              <span className="flex items-center gap-3 text-[13px] text-danger-light"><Icon name="alert" size={20} className="text-danger" />
                <span><b className="mono">{data.overdue.count}</b> {data.overdue.count === 1 ? "conta vencida" : "contas vencidas"} · <span className="mono">{brl(data.overdue.total)}</span></span></span>
              <span className="text-[12px] font-semibold text-danger">Ver</span>
            </Link>
          )}
          {data.overdue.count === 0 && data.upcoming.count > 0 && (
            <Link href="/atrasos" className="well-gold card-link flex items-center justify-between gap-3">
              <span className="flex items-center gap-3 text-[13px] text-gold"><Icon name="clock" size={20} />
                <span><b className="mono">{data.upcoming.count}</b> {data.upcoming.count === 1 ? "conta vence" : "contas vencem"} nos próximos 7 dias · <span className="mono">{brl(data.upcoming.total)}</span></span></span>
              <span className="text-[12px] font-semibold">Ver</span>
            </Link>
          )}
          {data.reserveAtRisk !== "OK" && (
            <div className="well-gold flex items-center gap-3 text-[13px] text-gold">
              <Icon name="alert" size={20} />
              {data.reserveAtRisk === "NEGATIVE"
                ? "A projeção do mês está negativa: as despesas previstas superam os rendimentos."
                : `A projeção do mês ficou abaixo da sua reserva de emergência (${brl(data.emergencyReserve)}).`}
            </div>
          )}

          <div className="stagger grid grid-cols-1 gap-4 min-[520px]:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
            <Kpi label="Total recebido" value={data.totals.received} tone="good" hint={`Previsto ${brl(data.totals.incomeTotal)}`} />
            <Kpi label="Total gasto" value={data.totals.spent} tone="bad" hint={`A pagar ${brl(data.totals.pendingExpenses)}`} />
            <Kpi label="Saldo atual" value={data.totals.balance} tone={data.totals.balance >= 0 ? "plain" : "bad"} hint="Recebido − gasto" />
            <Kpi label="Projeção do fim do mês" value={data.totals.projected} tone={data.totals.projected >= 0 ? "good" : "bad"} hint="Rendimentos − despesas previstas" />
          </div>

          <div className="stagger grid grid-cols-1 gap-4 min-[520px]:grid-cols-2">
            <Kpi size="md" label="Investido no mês" value={data.invested.paid} tone="good" hint={data.invested.planned > data.invested.paid ? `Previsto ${brl(data.invested.planned)}` : undefined} />
            <Kpi size="md" label="Dízimos e doações" value={data.tithes.paid} tone="gold" hint={data.tithes.planned > data.tithes.paid ? `Previsto ${brl(data.tithes.planned)}` : undefined} />
          </div>

          {data.topCategory && (
            <div className="card flex items-center gap-4 !p-[18px]">
              <div className="chip !h-12 !w-12 !rounded-[18px]"><span className="h-4 w-4 rounded-full" style={{ background: data.topCategory.color }} /></div>
              <div className="min-w-0">
                <div className="kicker">Maior gasto do mês</div>
                <div className="mt-1 truncate text-[16px] font-semibold text-white">{data.topCategory.label}</div>
                <div className="mono text-[12px] text-t3">{brl(data.topCategory.total)} · {data.topCategory.percent.toFixed(0)}% das despesas</div>
              </div>
            </div>
          )}

          <div className="card">
            <SectionTitle>Despesas por categoria</SectionTitle>
            {data.categories.length === 0 ? (
              <div className="well py-8 text-center text-[13px] text-t3">Nenhuma despesa neste mês.</div>
            ) : (
              <DonutChart data={data.categories} total={data.totals.expenseTotal} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
