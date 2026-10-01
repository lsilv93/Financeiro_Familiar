"use client";
import { useEffect, type ReactNode } from "react";

export function Spinner({ className = "" }: { className?: string }) {
  return <div className={`mx-auto h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent ${className}`} role="status" aria-label="Carregando" />;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300" role="alert">{message}</div>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">{children}</div>;
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export function ScopeBadge({ scope }: { scope: "PERSONAL" | "FAMILY" }) {
  return scope === "FAMILY" ? (
    <span className="badge bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">Familiar</span>
  ) : (
    <span className="badge bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">Pessoal</span>
  );
}

export function ScopeTabs({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const opts = [["ALL", "Tudo"], ["PERSONAL", "Pessoal"], ["FAMILY", "Familiar"]];
  return (
    <div className="inline-flex rounded-xl bg-slate-200 p-1 text-sm dark:bg-slate-800" role="tablist">
      {opts.map(([v, l]) => (
        <button key={v} role="tab" aria-selected={value === v} onClick={() => onChange(v)}
          className={`rounded-lg px-3 py-1.5 font-medium transition ${value === v ? "bg-white shadow dark:bg-slate-700" : "text-slate-600 dark:text-slate-400"}`}>
          {l}
        </button>
      ))}
    </div>
  );
}

export function MonthPicker({ month, onChange, label }: { month: string; onChange: (m: string) => void; label: string }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-1 dark:border-slate-700 dark:bg-slate-900">
      <button aria-label="Mês anterior" className="btn-ghost" onClick={() => onChange(shift(month, -1))}>‹</button>
      <span className="min-w-[8.5rem] text-center text-sm font-semibold">{label}</span>
      <button aria-label="Próximo mês" className="btn-ghost" onClick={() => onChange(shift(month, 1))}>›</button>
    </div>
  );
}

function shift(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
}
