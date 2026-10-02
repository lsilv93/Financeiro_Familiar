"use client";
import { brl, useApi } from "@/lib/client";

type M = {
  quotes: { code: string; name: string; bid: number; pct: number | null }[];
  rates: { code: string; name: string; value: number; date: string; unit: string }[];
};

/** Faixa com dólar, euro, bitcoin, Selic e IPCA. Some sozinha se as fontes estiverem indisponíveis. */
export function MarketStrip() {
  const { data } = useApi<M>("/api/market");
  if (!data || (!data.quotes.length && !data.rates.length)) return null;
  const items = [
    ...data.quotes.map((q) => ({ key: q.code, name: q.name, value: q.code === "BTCBRL" ? brl(q.bid).replace(",00", "") : brl(q.bid), delta: q.pct })),
    ...data.rates.map((r) => ({ key: r.code, name: r.name, value: `${r.value.toFixed(2).replace(".", ",")}${r.unit === "%" ? "%" : "% a.a."}`, delta: null as number | null })),
  ];
  return (
    <div className="scroll-x -mx-1 flex gap-3 px-1 pb-2">
      {items.map((i) => (
        <div key={i.key} className="card-sm flex min-w-[148px] flex-1 flex-col gap-1 !rounded-[20px] !p-3.5">
          <span className="kicker">{i.name}</span>
          <span className="mono text-[15px] font-semibold text-fg">{i.value}</span>
          {i.delta !== null && (
            <span className={`mono text-[11px] font-semibold ${i.delta >= 0 ? "text-lime" : "text-danger"}`}>{i.delta >= 0 ? "▲" : "▼"} {Math.abs(i.delta).toFixed(2).replace(".", ",")}%</span>
          )}
        </div>
      ))}
    </div>
  );
}
