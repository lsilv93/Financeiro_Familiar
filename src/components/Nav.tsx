"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { useApi } from "@/lib/client";
import { ThemeToggle } from "./ThemeToggle";

const LINKS = [
  { href: "/painel", label: "Painel", icon: "📊" },
  { href: "/lancamentos", label: "Extrato", icon: "🧾" },
  { href: "/atrasos", label: "Contas a pagar", icon: "⏰" },
  { href: "/parcelas", label: "Parcelas", icon: "💳" },
  { href: "/previsao", label: "Previsão", icon: "🔮" },
  { href: "/cartoes", label: "Cartões", icon: "🏦" },
  { href: "/configuracoes", label: "Configurações", icon: "⚙️" },
];

function useOverdueCount() {
  const { data } = useApi<{ overdue: unknown[] }>("/api/overdue");
  return data?.overdue.length ?? 0;
}

export function Sidebar({ userName }: { userName: string }) {
  const path = usePathname();
  const overdue = useOverdueCount();
  return (
    <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:flex">
      <div className="mb-6 flex items-center gap-2 px-2 text-lg font-bold text-brand-700 dark:text-brand-400">💰 Financeiro Familiar</div>
      <Link href="/lancamentos/novo" className="btn-primary mb-4">+ Novo lançamento</Link>
      <nav className="flex-1 space-y-1">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href}
            className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition ${path.startsWith(l.href) ? "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}>
            <span className="flex items-center gap-3"><span aria-hidden>{l.icon}</span>{l.label}</span>
            {l.href === "/atrasos" && overdue > 0 && <span className="badge bg-red-600 text-white">{overdue}</span>}
          </Link>
        ))}
      </nav>
      <div className="space-y-1 border-t border-slate-200 pt-3 dark:border-slate-800">
        <div className="truncate px-2 text-sm text-slate-500">{userName}</div>
        <ThemeToggle className="w-full justify-start" />
        <button onClick={() => signOut({ callbackUrl: "/login" })} className="btn-ghost w-full justify-start">🚪 Sair</button>
      </div>
    </aside>
  );
}

export function BottomNav() {
  const path = usePathname();
  const overdue = useOverdueCount();
  const [more, setMore] = useState(false);
  const item = (href: string, label: string, icon: string, badge = 0) => (
    <Link href={href} onClick={() => setMore(false)}
      className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${path.startsWith(href) ? "text-brand-600 dark:text-brand-400" : "text-slate-500"}`}>
      <span className="text-xl" aria-hidden>{icon}</span>{label}
      {badge > 0 && <span className="absolute right-1/4 top-1 rounded-full bg-red-600 px-1.5 text-[10px] text-white">{badge}</span>}
    </Link>
  );
  return (
    <>
      {more && (
        <div className="fixed inset-0 z-30 md:hidden" onClick={() => setMore(false)}>
          <div className="absolute inset-x-3 bottom-20 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            {LINKS.filter((l) => ["/parcelas", "/previsao", "/cartoes", "/configuracoes"].includes(l.href)).map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setMore(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800">
                <span aria-hidden>{l.icon}</span>{l.label}
              </Link>
            ))}
            <ThemeToggle className="w-full justify-start px-3 py-3" />
            <button onClick={() => signOut({ callbackUrl: "/login" })} className="btn-ghost w-full justify-start px-3 py-3">🚪 Sair</button>
          </div>
        </div>
      )}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-end border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-slate-800 dark:bg-slate-900 md:hidden">
        {item("/painel", "Painel", "📊")}
        {item("/lancamentos", "Extrato", "🧾")}
        <Link href="/lancamentos/novo" aria-label="Novo lançamento" className="-mt-5 mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-3xl text-white shadow-lg">+</Link>
        {item("/atrasos", "Contas", "⏰", overdue)}
        <button onClick={() => setMore((v) => !v)} className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-slate-500">
          <span className="text-xl" aria-hidden>☰</span>Mais
        </button>
      </nav>
    </>
  );
}
