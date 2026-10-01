"use client";
import { brl, useApi } from "@/lib/client";
import type { Tx } from "@/lib/types";
import { Empty, ErrorBox, PageHeader, Spinner } from "@/components/ui";
import { TransactionList } from "@/components/TransactionList";

type Item = Tx & { daysDiff: number };
type Res = { overdue: Item[]; upcoming: Item[]; overdueTotal: number; upcomingTotal: number; days: number };

export default function AtrasosPage() {
  const { data, error, loading, reload } = useApi<Res>("/api/overdue?days=7");
  return (
    <div>
      <PageHeader title="Contas a pagar" subtitle="Vencidas e próximas do vencimento" />
      {error && <ErrorBox message={error} />}
      {loading && !data && <Spinner className="my-10" />}
      {data && (
        <div className="space-y-4">
          <section className="card border-red-200 dark:border-red-900">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-semibold text-red-700 dark:text-red-400">🚨 Em atraso ({data.overdue.length})</h2>
              <span className="font-bold tabular-nums text-red-700 dark:text-red-400">{brl(data.overdueTotal)}</span>
            </div>
            {data.overdue.length === 0 ? <Empty>Nenhuma conta em atraso. 🎉</Empty> : (
              <>
                <ul className="mb-2 space-y-1 text-xs text-red-700 dark:text-red-300">
                  {data.overdue.map((t) => <li key={t.id}>{t.description}: {Math.abs(t.daysDiff)} {Math.abs(t.daysDiff) === 1 ? "dia" : "dias"} de atraso</li>)}
                </ul>
                <TransactionList items={data.overdue} onChanged={reload} />
              </>
            )}
          </section>
          <section className="card border-amber-200 dark:border-amber-900">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-semibold text-amber-700 dark:text-amber-400">⏳ Vencem em até {data.days} dias ({data.upcoming.length})</h2>
              <span className="font-bold tabular-nums text-amber-700 dark:text-amber-400">{brl(data.upcomingTotal)}</span>
            </div>
            {data.upcoming.length === 0 ? <Empty>Nada vencendo nos próximos dias.</Empty> : <TransactionList items={data.upcoming} onChanged={reload} />}
          </section>
        </div>
      )}
    </div>
  );
}
