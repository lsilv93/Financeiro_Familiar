"use client";
import { brl, useApi } from "@/lib/client";
import type { Tx } from "@/lib/types";
import { Empty, ErrorBox, PageHeader, SectionTitle, Spinner } from "@/components/ui";
import { TransactionList } from "@/components/TransactionList";

type Item = Tx & { daysDiff: number };
type Res = { overdue: Item[]; upcoming: Item[]; overdueTotal: number; upcomingTotal: number; days: number };

export default function AtrasosPage() {
  const { data, error, loading, reload } = useApi<Res>("/api/overdue?days=7");
  return (
    <div>
      <PageHeader title="Contas a pagar" subtitle="Vencidas e próximas do vencimento" />
      {error && <ErrorBox message={error} />}
      {loading && !data && <Spinner className="my-16" />}
      {data && (
        <div className="stagger space-y-5">
          <section className="card">
            <SectionTitle right={<span className="badge badge-danger mono">{brl(data.overdueTotal)}</span>}>Em atraso ({data.overdue.length})</SectionTitle>
            {data.overdue.length === 0 ? <Empty>Nenhuma conta em atraso.</Empty> : (
              <>
                <div className="well-danger mb-2 space-y-1 text-[12px] text-danger-light">
                  {data.overdue.map((t) => <div key={t.id}>{t.description}: {Math.abs(t.daysDiff)} {Math.abs(t.daysDiff) === 1 ? "dia" : "dias"} de atraso</div>)}
                </div>
                <TransactionList items={data.overdue} onChanged={reload} />
              </>
            )}
          </section>
          <section className="card">
            <SectionTitle right={<span className="badge badge-gold mono">{brl(data.upcomingTotal)}</span>}>Vencem em até {data.days} dias ({data.upcoming.length})</SectionTitle>
            {data.upcoming.length === 0 ? <Empty>Nada vencendo nos próximos dias.</Empty> : <TransactionList items={data.upcoming} onChanged={reload} />}
          </section>
        </div>
      )}
    </div>
  );
}
