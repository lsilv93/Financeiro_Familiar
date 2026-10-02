"use client";
import { useState } from "react";
import Link from "next/link";
import { brl, useApi } from "@/lib/client";
import { periodLabel, shiftRef, todayClient, type Period } from "@/lib/clientDates";
import { DonutChart } from "@/components/DonutChart";
import { BalanceLine, FlowBars, Gauge, HBars, type FlowPoint } from "@/components/charts";
import { MarketStrip } from "@/components/MarketStrip";
import { ChartGrowth } from "@/components/Illustrations";
import { Icon } from "@/components/Icon";
import { HealthMessage, MonthlyComparison } from "@/components/DashboardExtras";
import { ErrorBox, PageHeader, ScopeTabs, SectionTitle, Spinner } from "@/components/ui";

type Dash = {
  period: Period;
  range: { start: string; end: string };
  unit: "day" | "month" | "year";
  totals: { received: number; spent: number; balance: number; projected: number; incomeTotal: number; expenseTotal: number; pendingExpenses: number };
  series: (FlowPoint & { key: string })[];
  categories: { key: string; label: string; color: string; total: number; percent: number }[];
  topCategory: { label: string; total: number; percent: number; color: string } | null;
  topExpenses: { id: string; description: string; category: string; amount: number }[];
  invested: { paid: number; planned: number };
  tithes: { paid: number; planned: number };
  comparison: { income: number; expense: number; balance: number; incomeDelta: number | null; expenseDelta: number | null } | null;
  pace: { daysElapsed: number; daysTotal: number; avgDailySpend: number; paceSpend: number | null; paceBalance: number | null; insufficient: boolean; minDays: number };
  indicators: { savingsRate: number | null; commitment: number | null; rule503020: { needs: number; wants: number; saving: number; needsPct: number | null; wantsPct: number | null; savingPct: number | null } };
  savings: { total: number; coverageMonths: number | null; avgMonthlyExpense: number; goal: number };
  cards: { limit: number; used: number; usedPercent: number | null };
  health: { score: number; label: string; hasData: boolean; factors: { key: string; label: string; max: number; pts: number; hint: string }[] };
  overdue: { count: number; total: number };
  upcoming: { count: number; total: number };
  emergencyReserve: number;
  reserveAtRisk: "OK" | "RESERVE" | "NEGATIVE";
};

const PERIODS: [Period, string][] = [["day", "Dia"], ["week", "Semana"], ["month", "Mês"], ["year", "Ano"], ["total", "Total"]];
const PREV_LABEL: Record<string, string> = { day: "dia anterior", week: "semana anterior", month: "mês anterior", year: "ano anterior" };
const pct = (v: number | null, d = 0) => (v === null ? "—" : `${v.toFixed(d).replace(".", ",")}%`);

function Delta({ v, goodWhenUp }: { v: number | null | undefined; goodWhenUp: boolean }) {
  if (v === null || v === undefined) return null;
  const up = v >= 0;
  const good = up === goodWhenUp;
  return <span className={`badge mono ${good ? "badge-lime" : "badge-danger"}`}>{up ? "▲" : "▼"} {Math.abs(v).toFixed(0)}%</span>;
}

function Kpi({ label, value, tone, hint, delta }: { label: string; value: number; tone?: "good" | "bad" | "plain"; hint?: string; delta?: React.ReactNode }) {
  const color = tone === "good" ? "text-lime" : tone === "bad" ? "text-danger" : "text-fg";
  return (
    <div className="card !p-[18px]">
      <div className="mb-3 flex items-center justify-between gap-2"><span className="kicker">{label}</span>{delta}</div>
      <div className="well !rounded-[18px] !px-4 !py-3"><div className={`mono truncate text-[22px] font-semibold ${color}`}>{brl(value)}</div></div>
      {hint && <div className="mt-2.5 text-[11px] text-t4">{hint}</div>}
    </div>
  );
}

function Meter({ label, value, target, hint, invert }: { label: string; value: number | null; target: number; hint: string; invert?: boolean }) {
  const ok = value === null ? true : invert ? value >= target : value <= target;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[12px]">
        <span className="text-t2">{label}</span>
        <span className={`mono font-semibold ${value === null ? "text-t4" : ok ? "text-lime" : "text-gold"}`}>{pct(value)}</span>
      </div>
      <div className="track !h-2.5"><div className={`fill ${ok ? "" : "!bg-[var(--gold)]"}`} style={{ width: `${Math.min(100, Math.max(2, value ?? 0))}%`, background: ok ? undefined : "var(--gold)" }} /></div>
      <div className="mt-1 text-[10px] text-t4">{hint}</div>
    </div>
  );
}

export default function PainelPage() {
  const [period, setPeriod] = useState<Period>("month");
  const [ref, setRef] = useState(todayClient());
  const [scope, setScope] = useState("ALL");
  const { data, error, loading } = useApi<Dash>(`/api/dashboard?period=${period}&ref=${ref}&scope=${scope}`);
  const label = periodLabel(period, ref, data?.range);
  const isCurrent = period === "total" || shiftRef(period, ref, 0) === shiftRef(period, todayClient(), 0);
  // O comparativo mês a mês termina no mês em análise (no ano: dezembro ou o mês atual; no total: o mês atual).
  const nowMonth = todayClient().slice(0, 7);
  const comparisonEnd = period === "total" ? nowMonth : period === "year" ? (ref.slice(0, 4) === nowMonth.slice(0, 4) ? nowMonth : `${ref.slice(0, 4)}-12`) : ref.slice(0, 7);

  return (
    <div>
      <PageHeader title="Painel" subtitle="Indicadores, gráficos e projeções das suas finanças" />

      <div className="mb-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="seg" role="tablist" aria-label="Período">
            {PERIODS.map(([p, l]) => (
              <button key={p} role="tab" aria-selected={period === p} className="seg-btn" onClick={() => { setPeriod(p); if (p !== "total") setRef(todayClient()); }}>{l}</button>
            ))}
          </div>
          <ScopeTabs value={scope} onChange={setScope} />
        </div>
        {period !== "total" && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="seg items-center">
              <button aria-label="Período anterior" className="seg-btn !flex-none !px-4" onClick={() => setRef(shiftRef(period, ref, -1))}>‹</button>
              <span className="min-w-[10rem] text-center text-[13px] font-semibold text-fg">{label}</span>
              <button aria-label="Próximo período" className="seg-btn !flex-none !px-4" onClick={() => setRef(shiftRef(period, ref, 1))}>›</button>
            </div>
            {!isCurrent && <button className="btn-ghost btn-xs" onClick={() => setRef(todayClient())}>Voltar para hoje</button>}
          </div>
        )}
      </div>

      <div className="mb-5"><MarketStrip /></div>

      {error && <ErrorBox message={error} />}
      {loading && !data && <Spinner className="my-16" />}
      {data && (
        <div className={`space-y-5 transition-opacity ${loading ? "opacity-60" : ""}`}>
          <HealthMessage period={data.period} totals={data.totals} healthLabel={data.health.label} healthScore={data.health.score} hasData={data.health.hasData} />
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
          {data.reserveAtRisk === "RESERVE" && period !== "day" && (
            <div className="well-gold flex items-center gap-3 text-[13px] text-gold">
              <Icon name="alert" size={20} />
              {`A projeção do período ficou abaixo da sua reserva de emergência (${brl(data.emergencyReserve)}).`}
            </div>
          )}

          <div className="stagger grid grid-cols-1 gap-4 min-[520px]:grid-cols-2 xl:grid-cols-4">
            <Kpi label="Total recebido" value={data.totals.received} tone="good" hint={`Previsto ${brl(data.totals.incomeTotal)}`} delta={<Delta v={data.comparison?.incomeDelta} goodWhenUp />} />
            <Kpi label="Total gasto" value={data.totals.spent} tone="bad" hint={`A pagar ${brl(data.totals.pendingExpenses)}`} delta={<Delta v={data.comparison?.expenseDelta} goodWhenUp={false} />} />
            <Kpi label="Saldo atual" value={data.totals.balance} tone={data.totals.balance >= 0 ? "plain" : "bad"} hint="Recebido − gasto" />
            <Kpi label="Projeção do período" value={data.totals.projected} tone={data.totals.projected >= 0 ? "good" : "bad"} hint="Rendimentos − despesas previstas" />
          </div>
          {data.comparison && period !== "total" && <p className="-mt-2 text-[11px] text-t4">As variações comparam com o {PREV_LABEL[period]} (previsto: receitas {brl(data.comparison.income)} · despesas {brl(data.comparison.expense)}).</p>}

          <div className="grid gap-5 lg:grid-cols-3">
            <div className="card lg:col-span-2">
              <SectionTitle>Fluxo de caixa: receitas × despesas</SectionTitle>
              <FlowBars data={data.series} />
            </div>
            <div className="card">
              <SectionTitle>Saúde financeira</SectionTitle>
              {data.health.hasData ? (
                <>
                  <Gauge value={data.health.score} label={data.health.label} />
                  <ul className="mt-4 space-y-2.5">
                    {data.health.factors.map((f) => (
                      <li key={f.key}>
                        <div className="flex items-center justify-between text-[11px]"><span className="text-t2">{f.label}</span><span className="mono text-t3">{Math.round(f.pts)}/{f.max}</span></div>
                        <div className="track mt-1 !h-1.5"><div className="fill" style={{ width: `${(f.pts / f.max) * 100}%` }} /></div>
                      </li>
                    ))}
                  </ul>
                </>
              ) : <div className="well py-8 text-center text-[13px] text-t3">Lance receitas e despesas para calcular sua pontuação.</div>}
            </div>
          </div>

          <MonthlyComparison end={comparisonEnd} scope={scope} />

          <div className="card">
            <SectionTitle>Saldo acumulado e projeção</SectionTitle>
            <BalanceLine data={data.series} />
            {data.pace.insufficient && <p className="well mt-4 text-[12px] text-t3">A projeção pelo ritmo de gastos aparece a partir do {data.pace.minDays}º dia do período, quando há dados suficientes para uma média confiável.</p>}
            {data.pace.paceSpend !== null && (
              <div className="well mt-4 grid gap-3 text-[12px] sm:grid-cols-3">
                <div><div className="kicker mb-1">Gasto médio por dia</div><div className="mono text-[15px] font-semibold text-fg">{brl(data.pace.avgDailySpend)}</div><div className="text-t4">{data.pace.daysElapsed} de {data.pace.daysTotal} dias</div></div>
                <div><div className="kicker mb-1">Gasto no ritmo atual</div><div className="mono text-[15px] font-semibold text-fg">{brl(data.pace.paceSpend)}</div><div className="text-t4">se mantiver o ritmo até o fim</div></div>
                <div><div className="kicker mb-1">Saldo final estimado</div><div className={`mono text-[15px] font-semibold ${(data.pace.paceBalance ?? 0) >= 0 ? "text-lime" : "text-danger"}`}>{brl(data.pace.paceBalance ?? 0)}</div><div className="text-t4">receitas − maior entre ritmo e previsto</div></div>
              </div>
            )}
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="card">
              <SectionTitle>Despesas por categoria</SectionTitle>
              {data.categories.length === 0 ? <div className="well py-8 text-center text-[13px] text-t3">Nenhuma despesa neste período.</div> : <DonutChart data={data.categories} total={data.totals.expenseTotal} />}
            </div>
            <div className="card">
              <SectionTitle>Maiores gastos do período</SectionTitle>
              {data.topExpenses.length === 0 ? <div className="well py-8 text-center text-[13px] text-t3">Sem despesas no período.</div> : (
                <ul className="rows">
                  {data.topExpenses.map((t, i) => (
                    <li key={t.id} className="flex items-center gap-3 py-3">
                      <span className="chip !h-9 !w-9 mono text-[12px] font-semibold text-t3">{i + 1}</span>
                      <div className="min-w-0 flex-1"><div className="truncate text-[13px] font-semibold text-fg">{t.description}</div><div className="truncate text-[11px] text-t3">{t.category}</div></div>
                      <div className="mono text-[13px] font-semibold text-fg">{brl(t.amount)}</div>
                    </li>
                  ))}
                </ul>
              )}
              {data.topCategory && <div className="well mt-3 flex items-center gap-3 text-[12px] text-t2"><span className="h-3 w-3 shrink-0 rounded-full" style={{ background: data.topCategory.color }} />Maior categoria: <b className="text-fg">{data.topCategory.label}</b> <span className="mono ml-auto">{data.topCategory.percent.toFixed(0)}%</span></div>}
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <div className="card space-y-5 lg:col-span-2">
              <SectionTitle>Indicadores bancários</SectionTitle>
              <div className="grid gap-5 sm:grid-cols-2">
                <Meter label="Taxa de poupança" value={data.indicators.savingsRate} target={20} invert hint="Parte da renda que sobra (meta: 20% ou mais)" />
                <Meter label="Comprometimento da renda" value={data.indicators.commitment} target={80} hint="Despesas ÷ receitas (ideal: até 80%)" />
                <Meter label="Uso do limite dos cartões" value={data.cards.usedPercent} target={30} hint={data.cards.limit ? `${brl(data.cards.used)} de ${brl(data.cards.limit)} (ideal: até 30%)` : "Cadastre seus cartões em Cartões"} />
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-[12px]"><span className="text-t2">Reserva de emergência</span><span className="mono font-semibold text-lime">{data.savings.coverageMonths === null ? "—" : `${data.savings.coverageMonths.toFixed(1).replace(".", ",")} meses`}</span></div>
                  <div className="track !h-2.5"><div className="fill" style={{ width: `${Math.min(100, ((data.savings.coverageMonths ?? 0) / 6) * 100)}%` }} /></div>
                  <div className="mt-1 text-[10px] text-t4">{brl(data.savings.total)} guardados · meta: 6 meses de despesas · <Link href="/poupanca" className="font-semibold text-lime">ver reserva</Link></div>
                </div>
              </div>
              <div className="groove pt-5">
                <div className="mb-3 flex items-center justify-between"><span className="kicker">Regra 50 / 30 / 20</span><span className="text-[10px] text-t4">sobre a renda do período</span></div>
                <div className="grid gap-5 sm:grid-cols-3">
                  <Meter label="Necessidades" value={data.indicators.rule503020.needsPct} target={50} hint={`${brl(data.indicators.rule503020.needs)} · meta até 50%`} />
                  <Meter label="Desejos" value={data.indicators.rule503020.wantsPct} target={30} hint={`${brl(data.indicators.rule503020.wants)} · meta até 30%`} />
                  <Meter label="Investimentos" value={data.indicators.rule503020.savingPct} target={20} invert hint={`${brl(data.indicators.rule503020.saving)} · meta 20% ou mais`} />
                </div>
              </div>
            </div>
            <div className="space-y-5">
              <div className="card relative overflow-hidden !p-[18px]">
                <div className="kicker mb-3">Investido no período</div>
                <div className="well !rounded-[18px] !px-4 !py-3"><div className="mono text-[20px] font-semibold text-lime">{brl(data.invested.paid)}</div></div>
                {data.invested.planned > data.invested.paid && <div className="mt-2 text-[11px] text-t4">Previsto {brl(data.invested.planned)}</div>}
                <ChartGrowth className="absolute -right-2 -top-1 h-16 w-24 opacity-70" />
              </div>
              <div className="card !p-[18px]">
                <div className="kicker mb-3">Dízimos e doações</div>
                <div className="well !rounded-[18px] !px-4 !py-3"><div className="mono text-[20px] font-semibold text-gold">{brl(data.tithes.paid)}</div></div>
                {data.tithes.planned > data.tithes.paid && <div className="mt-2 text-[11px] text-t4">Previsto {brl(data.tithes.planned)}</div>}
              </div>
              <Link href="/poupanca" className="card card-link flex items-center gap-3 !p-[18px]">
                <span className="chip text-lime"><Icon name="coin" size={20} /></span>
                <span className="min-w-0"><span className="kicker block">Minha reserva</span><span className="mono text-[16px] font-semibold text-fg">{brl(data.savings.total)}</span></span>
                <span className="ml-auto text-[12px] font-semibold text-lime">Abrir</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
