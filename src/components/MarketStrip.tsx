"use client";
import Link from "next/link";
import { useApi } from "@/lib/client";
import { fmtIndicator, type Indicator } from "@/lib/indicators";

const MAIN = ["USDBRL", "EURBRL", "SELIC", "IPCA12", "IBOV"];

/** Faixa compacta com os principais valores do dia. Some sozinha se as fontes estiverem indisponíveis. */
export function MarketStrip() {
  const { data } = useApi<{ indicators: Indicator[] }>("/api/market");
  const items = MAIN.map((c) => data?.indicators.find((i) => i.code === c)).filter((x): x is Indicator => !!x);
  if (!items.length) return null;
  return (
    <Link href="/noticias" className="scroll-x -mx-1 flex gap-3 px-1 pb-2" aria-label="Indicadores do dia">
      {items.map((i) => (
        <div key={i.code} className="card-sm flex min-w-[140px] flex-1 flex-col gap-1 !rounded-[20px] !p-3.5">
          <span className="kicker">{i.name}</span>
          <span className="mono text-[15px] font-semibold text-fg">{fmtIndicator(i)}</span>
          {i.pct !== null && <span className={`mono text-[11px] font-semibold ${i.pct >= 0 ? "text-lime" : "text-danger"}`}>{i.pct >= 0 ? "▲" : "▼"} {Math.abs(i.pct).toFixed(2).replace(".", ",")}%</span>}
        </div>
      ))}
    </Link>
  );
}
