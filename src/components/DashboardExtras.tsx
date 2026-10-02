"use client";
import { useState } from "react";
import { brl, useApi } from "@/lib/client";
import { MonthBars } from "./charts";
import { ErrorBox, SectionTitle, Spinner } from "./ui";

const fmtPct = (v: number) => `${v.toFixed(0).replace(".", ",")}%`;

const PERIOD_WORD: Record<string, string> = { day: "hoje", week: "nesta semana", month: "neste mês", year: "neste ano", total: "no período todo" };

type HealthInput = {
  period: string;
  totals: { received: number; spent: number; incomeTotal: number; expenseTotal: number };
  healthLabel: string;
  healthScore: number;
  hasData: boolean;
};

/** Mensagem principal do painel: a família está gastando mais do que recebe? */
export function HealthMessage({ period, totals, healthLabel, healthScore, hasData }: HealthInput) {
  const word = PERIOD_WORD[period] ?? "no período";
  const inc = totals.incomeTotal;
  const exp = totals.expenseTotal;
  const diff = inc - exp;
  const commit = inc > 0 ? (exp / inc) * 100 : null;

  let tone: "good" | "warn" | "bad" | "neutral";
  let icon: string;
  let title: string;
  let text: string;
  if (!hasData) {
    tone = "neutral"; icon = "📝";
    title = "Sem lançamentos para avaliar";
    text = `Ainda não há receitas nem despesas ${word}. Lance seus ganhos e gastos para acompanhar a saúde financeira.`;
  } else if (inc === 0) {
    tone = "bad"; icon = "🚨";
    title = "Gastos sem receita";
    text = `Há ${brl(exp)} em despesas ${word} e nenhuma receita lançada. Registre seus rendimentos para ver se o orçamento fecha.`;
  } else if (exp > inc) {
    tone = "bad"; icon = "🚨";
    title = "Atenção: você está gastando mais do que ganha";
    text = `As despesas ${word} (${brl(exp)}) superam as receitas (${brl(inc)}) em ${brl(-diff)}, ou seja, ${fmtPct(commit! - 100)} acima da renda. Reveja os maiores gastos e corte o que não for essencial.`;
  } else if (commit! > 80) {
    tone = "warn"; icon = "⚠️";
    title = "Cuidado: orçamento apertado";
    text = `Você está usando ${fmtPct(commit!)} da renda ${word} e sobram apenas ${brl(diff)}. O ideal é gastar até 80% e guardar o restante.`;
  } else {
    tone = "good"; icon = "✅";
    title = "Saúde financeira em dia";
    text = `Você está gastando ${fmtPct(commit!)} do que recebe ${word} e sobram ${brl(diff)} (${fmtPct(100 - commit!)} da renda). Continue assim e direcione a sobra para a reserva e investimentos.`;
  }

  const realizedOver = totals.spent > totals.received && totals.spent > 0;
  const cls = tone === "bad" ? "well-danger" : tone === "warn" ? "well-gold" : "well";
  const titleColor = tone === "bad" ? "text-danger" : tone === "warn" ? "text-gold" : tone === "good" ? "text-lime" : "text-fg";
  return (
    <div className={`${cls} flex flex-col gap-3 !p-[18px] sm:flex-row sm:items-center`} role="status" data-testid="health-message" style={tone === "good" ? { background: "var(--lime-well)" } : undefined}>
      <span className="text-[30px] leading-none" aria-hidden="true">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className={`text-[15px] font-semibold ${titleColor}`}>{title}</div>
        <p className="mt-1 text-[13px] text-t2">{text}</p>
        {hasData && (
          <p className="mt-1.5 text-[11px] text-t3">
            Realizado até agora: recebido <b className="mono text-t2">{brl(totals.received)}</b> · gasto <b className="mono text-t2">{brl(totals.spent)}</b>
            {realizedOver && <span className="text-danger"> · os pagamentos já passaram do que entrou</span>}
          </p>
        )}
      </div>
      {hasData && (
        <div className="shrink-0 text-left sm:text-right">
          <div className="kicker">Pontuação</div>
          <div className={`mono text-[22px] font-semibold ${titleColor}`}>{healthScore}<span className="text-[12px] text-t4">/100</span></div>
          <div className="text-[11px] text-t3">{healthLabel}</div>
        </div>
      )}
    </div>
  );
}

type Row = { month: string; label: string; income: number; incomePaid: number; expense: number; expensePaid: number; balance: number; incomeDelta: number | null; expenseDelta: number | null; isCurrent: boolean; isFuture: boolean };
type Monthly = {
  rows: Row[];
  summary: { avgIncome: number; avgExpense: number; monthsNegative: number; monthsWithData: number; maxExpense: Row | null; maxIncome: Row | null };
};

function Var({ v, goodWhenUp }: { v: number | null; goodWhenUp: boolean }) {
  if (v === null) return <span className="text-t4">—</span>;
  if (Math.abs(v) < 0.5) return <span className="text-t3">0%</span>;
  const up = v > 0;
  return <span className={up === goodWhenUp ? "text-lime" : "text-danger"}>{up ? "▲" : "▼"} {Math.abs(v).toFixed(0)}%</span>;
}

/** Comparativo de receitas e despesas mês a mês. */
export function MonthlyComparison({ end, scope }: { end: string; scope: string }) {
  const [months, setMonths] = useState(6);
  const { data, error, loading } = useApi<Monthly>(`/api/dashboard/monthly?end=${end}&months=${months}&scope=${scope}`);
  return (
    <div className="card" data-testid="monthly-comparison">
      <SectionTitle right={
        <div className="seg shrink-0" role="tablist" aria-label="Quantidade de meses">
          {[6, 12].map((n) => <button key={n} role="tab" aria-selected={months === n} className="seg-btn whitespace-nowrap !min-h-[32px] !px-3 !text-[12px]" onClick={() => setMonths(n)}>{n} meses</button>)}
        </div>
      }>Comparativo mês a mês</SectionTitle>
      {error && <ErrorBox message={error} />}
      {loading && !data && <Spinner className="my-10" />}
      {data && (
        <div className={`space-y-5 transition-opacity ${loading ? "opacity-60" : ""}`}>
          <div className="grid gap-3 text-[12px] min-[520px]:grid-cols-3">
            <div className="well"><div className="kicker mb-1">Média de receitas</div><div className="mono text-[16px] font-semibold text-lime">{brl(data.summary.avgIncome)}</div><div className="text-t4">por mês{data.summary.maxIncome ? ` · maior: ${data.summary.maxIncome.label}` : ""}</div></div>
            <div className="well"><div className="kicker mb-1">Média de despesas</div><div className="mono text-[16px] font-semibold text-danger">{brl(data.summary.avgExpense)}</div><div className="text-t4">por mês{data.summary.maxExpense ? ` · maior: ${data.summary.maxExpense.label}` : ""}</div></div>
            <div className={data.summary.monthsNegative ? "well-danger" : "well"}><div className="kicker mb-1">Meses no vermelho</div><div className={`mono text-[16px] font-semibold ${data.summary.monthsNegative ? "text-danger" : "text-fg"}`}>{data.summary.monthsNegative} de {data.summary.monthsWithData}</div><div className="text-t4">despesas maiores que receitas</div></div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <div className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-fg"><i className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--accent)" }} />Receitas mês a mês</div>
              <MonthBars label="Receitas mês a mês" color="var(--accent)" rows={data.rows.map((r) => ({ label: r.label, total: r.income, paid: r.incomePaid, isCurrent: r.isCurrent, isFuture: r.isFuture }))} />
            </div>
            <div>
              <div className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-fg"><i className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--danger)" }} />Despesas mês a mês</div>
              <MonthBars label="Despesas mês a mês" color="var(--danger)" rows={data.rows.map((r) => ({ label: r.label, total: r.expense, paid: r.expensePaid, isCurrent: r.isCurrent, isFuture: r.isFuture }))} />
            </div>
          </div>

          <div className="scroll-x -mx-1 px-1">
            <table className="w-full min-w-[520px] text-[12px]">
              <thead>
                <tr className="text-left text-t4">
                  <th className="py-2 pr-2 font-semibold">Mês</th>
                  <th className="py-2 pr-2 text-right font-semibold">Receitas</th>
                  <th className="py-2 pr-2 text-right font-semibold">Var.</th>
                  <th className="py-2 pr-2 text-right font-semibold">Despesas</th>
                  <th className="py-2 pr-2 text-right font-semibold">Var.</th>
                  <th className="py-2 text-right font-semibold">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {[...data.rows].reverse().map((r) => (
                  <tr key={r.month} className="border-t border-[var(--groove)]">
                    <td className={`py-2 pr-2 font-semibold ${r.isCurrent ? "text-lime" : "text-t2"}`}>{r.label}{r.isCurrent && <span className="ml-1 text-[10px] font-normal text-t4">(atual)</span>}{r.isFuture && <span className="ml-1 text-[10px] font-normal text-t4">(previsto)</span>}</td>
                    <td className="mono py-2 pr-2 text-right text-fg">{brl(r.income)}</td>
                    <td className="mono py-2 pr-2 text-right"><Var v={r.incomeDelta} goodWhenUp /></td>
                    <td className="mono py-2 pr-2 text-right text-fg">{brl(r.expense)}</td>
                    <td className="mono py-2 pr-2 text-right"><Var v={r.expenseDelta} goodWhenUp={false} /></td>
                    <td className={`mono py-2 text-right font-semibold ${r.balance < 0 ? "text-danger" : r.balance > 0 ? "text-lime" : "text-t4"}`}>{brl(r.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-t4">Valores por mês de vencimento (inclui previstos). A parte sólida das barras é o já recebido/pago; a variação compara com o mês anterior.</p>
        </div>
      )}
    </div>
  );
}
