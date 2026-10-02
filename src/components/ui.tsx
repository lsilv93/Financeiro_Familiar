"use client";
import { useEffect, type ReactNode } from "react";

export function Spinner({ className = "" }: { className?: string }) {
  return <div className={`mx-auto h-7 w-7 animate-spin rounded-full border-2 border-lime border-t-transparent ${className}`} role="status" aria-label="Carregando" />;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[26px] leading-tight text-fg">{title}</h1>
        {subtitle && <p className="mt-1 text-[13px] text-t3">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return <div className="well-danger mb-4 text-[13px] text-danger-light" role="alert">{message}</div>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="well py-8 text-center text-[13px] text-t3">{children}</div>;
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-t3">{children}</h2>
      {right}
    </div>
  );
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(10,27,41,.5)] p-4 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export function ScopeBadge({ scope }: { scope: "PERSONAL" | "FAMILY" }) {
  return scope === "FAMILY" ? <span className="badge badge-gold">Familiar</span> : <span className="badge">Pessoal</span>;
}

export function ScopeTabs({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const opts = [["ALL", "Tudo"], ["PERSONAL", "Pessoal"], ["FAMILY", "Familiar"]];
  return (
    <div className="seg" role="tablist">
      {opts.map(([v, l]) => (
        <button key={v} role="tab" aria-selected={value === v} onClick={() => onChange(v)} className="seg-btn">{l}</button>
      ))}
    </div>
  );
}

export function MonthPicker({ month, onChange, label }: { month: string; onChange: (m: string) => void; label: string }) {
  return (
    <div className="seg items-center">
      <button aria-label="Mês anterior" className="seg-btn !flex-none !px-4" onClick={() => onChange(shift(month, -1))}>‹</button>
      <span className="min-w-[9rem] text-center text-[13px] font-semibold text-fg">{label}</span>
      <button aria-label="Próximo mês" className="seg-btn !flex-none !px-4" onClick={() => onChange(shift(month, 1))}>›</button>
    </div>
  );
}

function shift(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
}
