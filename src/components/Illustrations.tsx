// Ilustrações animadas (SVG + CSS) com tema financeiro: moedas e cofrinho.
import type { CSSProperties } from "react";

export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="Financeiro Familiar">
      <defs>
        <linearGradient id="lm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#D0FF45" /><stop offset="1" stopColor="#A9E113" /></linearGradient>
      </defs>
      <circle cx="24" cy="24" r="21" fill="url(#lm)" />
      <circle cx="24" cy="24" r="16.5" fill="none" stroke="#000E19" strokeOpacity=".25" strokeWidth="1.5" />
      <rect x="14" y="26" width="5" height="9" rx="1.5" fill="#000E19" />
      <rect x="21.5" y="20" width="5" height="15" rx="1.5" fill="#000E19" />
      <rect x="29" y="13" width="5" height="22" rx="1.5" fill="#000E19" />
    </svg>
  );
}

export function Coin({ size = 48, className = "", style }: { size?: number; className?: string; style?: CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={`coin-spin ${className}`} style={style} aria-hidden="true">
      <defs><linearGradient id="cg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FFE27A" /><stop offset="1" stopColor="#E0A91A" /></linearGradient></defs>
      <circle cx="24" cy="24" r="22" fill="url(#cg)" />
      <circle cx="24" cy="24" r="17" fill="none" stroke="#9A6B00" strokeOpacity=".45" strokeWidth="2" />
      <text x="24" y="31" textAnchor="middle" fontSize="20" fontWeight="700" fill="#7A5200" fontFamily="Helvetica, Arial, sans-serif">R$</text>
    </svg>
  );
}

export function PiggyBank({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 150" className={className} aria-hidden="true">
      <defs><linearGradient id="pg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#E7FF9A" /><stop offset="1" stopColor="#A9E113" /></linearGradient></defs>
      <g className="coin-drop"><circle cx="100" cy="14" r="11" fill="#E8C547" /><text x="100" y="19" textAnchor="middle" fontSize="12" fontWeight="700" fill="#7A5200">R$</text></g>
      <ellipse cx="100" cy="126" rx="62" ry="7" fill="#000" opacity=".18" />
      <path d="M40 78c0-26 26-42 62-42 30 0 52 12 58 32l14 4v22l-14 3c-4 12-12 20-22 25v12h-18v-8c-6 1-12 1-18 1s-12 0-18-1v8H66v-12c-16-8-26-22-26-44z" fill="url(#pg)" />
      <circle cx="132" cy="64" r="4.5" fill="#000E19" />
      <path d="M76 46h50" stroke="#000E19" strokeOpacity=".55" strokeWidth="5" strokeLinecap="round" />
      <path d="M56 54c-8-2-12-8-10-16 8 0 14 4 16 10z" fill="#A9E113" />
    </svg>
  );
}

export function ChartGrowth({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 80" className={className} aria-hidden="true">
      {[18, 34, 28, 52, 66].map((h, i) => (
        <rect key={i} x={10 + i * 21} y={72 - h} width="14" height={h} rx="4" fill="var(--accent)" opacity={0.35 + i * 0.13} className="bar-grow" style={{ animationDelay: `${i * 120}ms` }} />
      ))}
    </svg>
  );
}
