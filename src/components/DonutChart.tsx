"use client";
import { brl } from "@/lib/client";

type Slice = { key: string; label: string; color: string; total: number; percent: number };

/** Gráfico de rosca em SVG puro (sem dependências). */
export function DonutChart({ data, total }: { data: Slice[]; total: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <svg viewBox="0 0 140 140" className="h-44 w-44 shrink-0 -rotate-90" role="img" aria-label="Gastos por categoria">
        <circle cx="70" cy="70" r={r} fill="none" strokeWidth="18" className="stroke-slate-200 dark:stroke-slate-800" />
        {data.map((s) => {
          const len = total ? (s.total / total) * c : 0;
          const el = (
            <circle key={s.key} cx="70" cy="70" r={r} fill="none" stroke={s.color} strokeWidth="18"
              strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset}>
              <title>{`${s.label}: ${brl(s.total)} (${s.percent}%)`}</title>
            </circle>
          );
          offset += len;
          return el;
        })}
        <g className="rotate-90 origin-center" style={{ transformOrigin: "70px 70px" }}>
          <text x="70" y="66" textAnchor="middle" className="fill-slate-500 text-[8px]">Total</text>
          <text x="70" y="80" textAnchor="middle" className="fill-slate-900 text-[10px] font-bold dark:fill-slate-100">{brl(total)}</text>
        </g>
      </svg>
      <ul className="w-full flex-1 space-y-1.5 text-sm">
        {data.map((s) => (
          <li key={s.key} className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: s.color }} />
              <span className="truncate">{s.label}</span>
            </span>
            <span className="shrink-0 tabular-nums text-slate-600 dark:text-slate-400">{brl(s.total)} · {s.percent.toFixed(0)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
