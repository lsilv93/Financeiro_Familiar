"use client";
import { useEffect, useRef, useState } from "react";
import { brl } from "@/lib/client";

export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((e) => setW(Math.floor(e[0].contentRect.width)));
    ro.observe(ref.current);
    setW(Math.floor(ref.current.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

export const compact = (n: number) => {
  const a = Math.abs(n);
  const s = a >= 1_000_000 ? `${(a / 1_000_000).toFixed(1).replace(".", ",")} mi` : a >= 1000 ? `${(a / 1000).toFixed(a >= 10000 ? 0 : 1).replace(".", ",")} mil` : String(Math.round(a));
  return (n < 0 ? "-" : "") + s;
};

function niceMax(v: number) {
  if (v <= 0) return 100;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
}

export type FlowPoint = { label: string; incomePaid: number; incomeTotal: number; expensePaid: number; expenseTotal: number; isCurrent?: boolean; isFuture?: boolean };

const H = 230;
const PAD = { l: 44, r: 8, t: 12, b: 26 };

function Axis({ w, max, min = 0, ticks = 4 }: { w: number; max: number; min?: number; ticks?: number }) {
  const ih = H - PAD.t - PAD.b;
  const y = (v: number) => PAD.t + ih - ((v - min) / (max - min || 1)) * ih;
  return (
    <g>
      {Array.from({ length: ticks + 1 }, (_, i) => min + ((max - min) / ticks) * i).map((v, i) => (
        <g key={i}>
          <line x1={PAD.l} x2={w - PAD.r} y1={y(v)} y2={y(v)} style={{ stroke: "var(--groove)" }} strokeWidth="1" />
          <text x={PAD.l - 6} y={y(v) + 3} textAnchor="end" fontSize="10" style={{ fill: "var(--t4)" }}>{compact(v)}</text>
        </g>
      ))}
    </g>
  );
}

function labelStep(n: number, w: number) {
  const fit = Math.max(1, Math.floor((w - PAD.l - PAD.r) / 34));
  return Math.max(1, Math.ceil(n / fit));
}

/** Barras agrupadas: receitas x despesas (parte "prevista" mais clara). */
export function FlowBars({ data }: { data: FlowPoint[] }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const max = niceMax(Math.max(1, ...data.flatMap((d) => [d.incomeTotal, d.expenseTotal])));
  const iw = Math.max(0, w - PAD.l - PAD.r);
  const ih = H - PAD.t - PAD.b;
  const slot = data.length ? iw / data.length : 0;
  const bw = Math.max(2, Math.min(22, slot * 0.34));
  const y = (v: number) => PAD.t + ih - (v / max) * ih;
  const step = labelStep(data.length, w);
  const a = active !== null ? data[active] : null;
  return (
    <div ref={ref} className="w-full">
      {w > 0 && (
        <svg width={w} height={H} role="img" aria-label="Receitas e despesas por período">
          <Axis w={w} max={max} />
          {data.map((d, i) => {
            const cx = PAD.l + slot * i + slot / 2;
            const bar = (x: number, paid: number, total: number, color: string) => (
              <g>
                <rect x={x} y={y(total)} width={bw} height={Math.max(0, y(0) - y(total))} rx={Math.min(5, bw / 2)} fill={color} opacity="0.3" />
                <rect x={x} y={y(paid)} width={bw} height={Math.max(0, y(0) - y(paid))} rx={Math.min(5, bw / 2)} fill={color} />
              </g>
            );
            return (
              <g key={i} onMouseEnter={() => setActive(i)} onClick={() => setActive(i)} style={{ cursor: "pointer" }}>
                <rect x={PAD.l + slot * i} y={PAD.t} width={slot} height={ih} fill={active === i ? "var(--hover-tint)" : "transparent"} rx="8" />
                {bar(cx - bw - 1, d.incomePaid, d.incomeTotal, "var(--accent)")}
                {bar(cx + 1, d.expensePaid, d.expenseTotal, "var(--danger)")}
                {i % step === 0 && <text x={cx} y={H - 8} textAnchor="middle" fontSize="10" style={{ fill: d.isCurrent ? "var(--accent)" : "var(--t4)", fontWeight: d.isCurrent ? 700 : 400 }}>{d.label}</text>}
              </g>
            );
          })}
        </svg>
      )}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11px] text-t3">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--accent)" }} />Receitas</span>
          <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--danger)" }} />Despesas</span>
          <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full opacity-30" style={{ background: "var(--t2)" }} />Previsto</span>
        </div>
        <div className="mono min-h-[16px] text-t2">{a ? `${a.label}: + ${brl(a.incomeTotal)} · − ${brl(a.expenseTotal)}` : "Toque numa barra para ver os valores"}</div>
      </div>
    </div>
  );
}

/** Saldo acumulado: realizado (sólido) e projetado (tracejado). */
export function BalanceLine({ data }: { data: FlowPoint[] }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  let r = 0, p = 0;
  const pts = data.map((d) => {
    r += d.incomePaid - d.expensePaid;
    p += d.incomeTotal - d.expenseTotal;
    return { label: d.label, real: r, proj: p, future: !!d.isFuture };
  });
  const vals = pts.flatMap((d) => [d.real, d.proj, 0]);
  const hi = niceMax(Math.max(...vals, 1));
  const lo = Math.min(...vals) < 0 ? -niceMax(-Math.min(...vals)) : 0;
  const iw = Math.max(0, w - PAD.l - PAD.r), ih = H - PAD.t - PAD.b;
  const x = (i: number) => PAD.l + (pts.length <= 1 ? iw / 2 : (iw * i) / (pts.length - 1));
  const y = (v: number) => PAD.t + ih - ((v - lo) / (hi - lo || 1)) * ih;
  const line = (key: "real" | "proj", until = pts.length) => pts.slice(0, until).map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join(" ");
  const lastReal = pts.reduce((acc, d, i) => (d.future ? acc : i), 0);
  const step = labelStep(pts.length, w);
  const a = active !== null ? pts[active] : null;
  return (
    <div ref={ref} className="w-full">
      {w > 0 && (
        <svg width={w} height={H} role="img" aria-label="Saldo acumulado e projeção">
          <defs>
            <linearGradient id="gProj" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" /><stop offset="100%" stopColor="var(--accent)" stopOpacity="0" /></linearGradient>
          </defs>
          <Axis w={w} max={hi} min={lo} />
          {lo < 0 && <line x1={PAD.l} x2={w - PAD.r} y1={y(0)} y2={y(0)} style={{ stroke: "var(--t4)" }} strokeDasharray="2 3" />}
          {pts.length > 1 && <path d={`${line("proj")} L${x(pts.length - 1)},${y(Math.max(lo, 0))} L${x(0)},${y(Math.max(lo, 0))} Z`} fill="url(#gProj)" />}
          <path d={line("proj")} fill="none" style={{ stroke: "var(--accent)" }} strokeWidth="2" strokeDasharray="5 5" strokeLinecap="round" opacity="0.8" />
          <path d={line("real", lastReal + 1)} fill="none" style={{ stroke: "var(--accent)" }} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {pts.map((d, i) => (
            <g key={i} onMouseEnter={() => setActive(i)} onClick={() => setActive(i)} style={{ cursor: "pointer" }}>
              <rect x={x(i) - Math.max(8, iw / pts.length / 2)} y={PAD.t} width={Math.max(16, iw / pts.length)} height={ih} fill="transparent" />
              {(active === i || (pts.length <= 12 && !d.future)) && <circle cx={x(i)} cy={y(d.real)} r={active === i ? 5 : 3} style={{ fill: "var(--accent)" }} />}
              {i % step === 0 && <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" style={{ fill: "var(--t4)" }}>{d.label}</text>}
            </g>
          ))}
        </svg>
      )}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11px] text-t3">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5"><i className="h-[3px] w-4 rounded" style={{ background: "var(--accent)" }} />Realizado</span>
          <span className="flex items-center gap-1.5"><i className="h-0 w-4 border-t-2 border-dashed" style={{ borderColor: "var(--accent)" }} />Projeção</span>
        </div>
        <div className="mono min-h-[16px] text-t2">{a ? `${a.label}: realizado ${brl(a.real)} · projetado ${brl(a.proj)}` : "Toque no gráfico para ver os valores"}</div>
      </div>
    </div>
  );
}

/** Evolução simples (uma série) em área: usada na poupança. */
export function AreaLine({ points }: { points: { label: string; value: number }[] }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const hi = niceMax(Math.max(1, ...points.map((p) => p.value)));
  const iw = Math.max(0, w - PAD.l - PAD.r), ih = H - PAD.t - PAD.b;
  const x = (i: number) => PAD.l + (points.length <= 1 ? iw / 2 : (iw * i) / (points.length - 1));
  const y = (v: number) => PAD.t + ih - (v / hi) * ih;
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const a = active !== null ? points[active] : null;
  return (
    <div ref={ref} className="w-full">
      {w > 0 && (
        <svg width={w} height={H} role="img" aria-label="Evolução da reserva">
          <defs><linearGradient id="gSav" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" /><stop offset="100%" stopColor="var(--accent)" stopOpacity="0" /></linearGradient></defs>
          <Axis w={w} max={hi} />
          {points.length > 1 && <path d={`${d} L${x(points.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill="url(#gSav)" />}
          <path d={d} fill="none" style={{ stroke: "var(--accent)" }} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((p, i) => (
            <g key={i} onMouseEnter={() => setActive(i)} onClick={() => setActive(i)} style={{ cursor: "pointer" }}>
              <rect x={x(i) - 14} y={PAD.t} width={28} height={ih} fill="transparent" />
              <circle cx={x(i)} cy={y(p.value)} r={active === i ? 5 : 3} style={{ fill: "var(--accent)" }} />
              {i % Math.max(1, Math.ceil(points.length / Math.floor(iw / 40))) === 0 && <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" style={{ fill: "var(--t4)" }}>{p.label}</text>}
            </g>
          ))}
        </svg>
      )}
      <div className="mono mt-2 min-h-[16px] text-[11px] text-t2">{a ? `${a.label}: ${brl(a.value)}` : "Toque no gráfico para ver os valores"}</div>
    </div>
  );
}

/** Barras horizontais (ranking de categorias). */
export function HBars({ rows }: { rows: { key: string; label: string; value: number; color: string; percent?: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.key}>
          <div className="mb-1.5 flex items-center justify-between gap-2 text-[12px]">
            <span className="truncate text-t2">{r.label}</span>
            <span className="mono shrink-0 text-t3">{brl(r.value)}{r.percent !== undefined ? ` · ${r.percent.toFixed(0)}%` : ""}</span>
          </div>
          <div className="track !h-2.5"><div className="h-full rounded-full" style={{ width: `${Math.max(3, (r.value / max) * 100)}%`, background: r.color }} /></div>
        </li>
      ))}
    </ul>
  );
}

/** Medidor semicircular (0-100). */
export function Gauge({ value, label }: { value: number; label: string }) {
  const r = 70, c = Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  const color = v >= 80 ? "var(--accent)" : v >= 60 ? "#7bd88f" : v >= 40 ? "var(--gold)" : "var(--danger)";
  return (
    <div className="relative mx-auto w-[220px]">
      <svg viewBox="0 0 180 110" className="w-full" role="img" aria-label={`Saúde financeira ${v} de 100 (${label})`}>
        <path d="M20 90 A70 70 0 0 1 160 90" fill="none" strokeWidth="14" strokeLinecap="round" style={{ stroke: "var(--groove)" }} />
        <path d="M20 90 A70 70 0 0 1 160 90" fill="none" strokeWidth="14" strokeLinecap="round" style={{ stroke: color, transition: "stroke-dasharray .8s var(--ease)" }} strokeDasharray={`${(v / 100) * c} ${c}`} />
      </svg>
      <div className="absolute inset-x-0 bottom-1 text-center">
        <div className="mono text-[34px] font-semibold leading-none text-fg">{v}</div>
        <div className="mt-1 text-[12px] font-semibold" style={{ color }}>{label}</div>
      </div>
    </div>
  );
}
