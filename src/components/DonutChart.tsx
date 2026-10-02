"use client";
import { brl } from "@/lib/client";

type Slice = { key: string; label: string; color: string; total: number; percent: number };

/** Gráfico de rosca em SVG puro (sem dependências). */
export function DonutChart({ data, total }: { data: Slice[]; total: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <div className="well grid shrink-0 place-items-center !rounded-full !p-3">
        <svg viewBox="0 0 140 140" className="h-44 w-44 -rotate-90" role="img" aria-label="Gastos por categoria">
          <circle cx="70" cy="70" r={r} fill="none" strokeWidth="16" style={{ stroke: "var(--donut-track)" }} />
          {data.map((s) => {
            const len = total ? (s.total / total) * c : 0;
            const el = (
              <circle key={s.key} cx="70" cy="70" r={r} fill="none" stroke={s.color} strokeWidth="16"
                strokeDasharray={`${Math.max(len - 1.5, 0)} ${c - Math.max(len - 1.5, 0)}`} strokeDashoffset={-offset}>
                <title>{`${s.label}: ${brl(s.total)} (${s.percent}%)`}</title>
              </circle>
            );
            offset += len;
            return el;
          })}
          <g style={{ transform: "rotate(90deg)", transformOrigin: "70px 70px" }}>
            <text x="70" y="66" textAnchor="middle" style={{ fill: "var(--t4)" }} fontSize="7" letterSpacing="1">TOTAL</text>
            <text x="70" y="80" textAnchor="middle" style={{ fill: "var(--fg)" }} fontSize="10" fontWeight="600" fontFamily="ui-monospace, Menlo, monospace">{brl(total)}</text>
          </g>
        </svg>
      </div>
      <ul className="w-full flex-1 space-y-2 text-[13px]">
        {data.map((s) => (
          <li key={s.key} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
              <span className="truncate text-t2">{s.label}</span>
            </span>
            <span className="mono shrink-0 text-[12px] text-t3">{brl(s.total)} · {s.percent.toFixed(0)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
