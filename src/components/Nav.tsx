"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { useApi } from "@/lib/client";
import { Icon } from "./Icon";

const LINKS = [
  { href: "/painel", label: "Painel", icon: "panel" },
  { href: "/lancamentos", label: "Extrato", icon: "list" },
  { href: "/atrasos", label: "Contas a pagar", icon: "clock" },
  { href: "/parcelas", label: "Parcelas", icon: "card" },
  { href: "/previsao", label: "Previsão", icon: "calendar" },
  { href: "/cartoes", label: "Cartões", icon: "bank" },
  { href: "/configuracoes", label: "Configurações", icon: "gear" },
];

function useOverdueCount() {
  const { data } = useApi<{ overdue: unknown[] }>("/api/overdue");
  return data?.overdue.length ?? 0;
}

export function Sidebar({ userName }: { userName: string }) {
  const path = usePathname();
  const overdue = useOverdueCount();
  return (
    <aside className="card fixed inset-y-4 left-4 hidden w-60 flex-col !p-4 md:flex" style={{ animation: "none" }}>
      <div className="mb-5 flex items-center gap-3 px-2 pt-1">
        <div className="chip !h-10 !w-10 text-lime"><Icon name="bank" size={18} /></div>
        <div className="leading-tight">
          <div className="text-[14px] font-semibold">Financeiro</div>
          <div className="kicker !text-[9px]">Familiar</div>
        </div>
      </div>
      <Link href="/lancamentos/novo" className="btn-primary mb-4"><Icon name="plus" size={16} />Novo lançamento</Link>
      <nav className="flex-1 space-y-1">
        {LINKS.map((l) => {
          const active = path.startsWith(l.href);
          return (
            <Link key={l.href} href={l.href}
              className={`flex min-h-[44px] items-center justify-between rounded-full px-4 text-[13px] font-semibold transition ${active ? "bg-[linear-gradient(150deg,#06121D,#0C1E2C)] text-lime shadow-[inset_4px_4px_9px_rgba(0,4,8,.66),inset_-3px_-3px_8px_rgba(52,90,120,.2)]" : "text-t3 hover:bg-[rgba(190,249,27,.09)] hover:text-lime"}`}>
              <span className="flex items-center gap-3"><Icon name={l.icon} size={18} />{l.label}</span>
              {l.href === "/atrasos" && overdue > 0 && <span className="badge badge-danger !px-2">{overdue}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="groove mt-3 pt-3">
        <div className="mb-1 truncate px-4 text-[12px] text-t3">{userName}</div>
        <button onClick={() => signOut({ callbackUrl: "/login" })} className="btn-ghost w-full !justify-start"><Icon name="out" size={16} />Sair</button>
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
      className={`relative flex min-h-[48px] flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl text-[10px] font-semibold transition ${path.startsWith(href) ? "text-lime" : "text-t3"}`}>
      <Icon name={icon} size={20} />{label}
      {badge > 0 && <span className="absolute right-[22%] top-0.5 rounded-full bg-danger px-1.5 text-[10px] font-bold text-ink">{badge}</span>}
    </Link>
  );
  return (
    <>
      {more && (
        <div className="fixed inset-0 z-30 md:hidden" onClick={() => setMore(false)}>
          <div className="card absolute inset-x-4 bottom-24 !p-3" onClick={(e) => e.stopPropagation()}>
            {LINKS.filter((l) => ["/parcelas", "/previsao", "/cartoes", "/configuracoes"].includes(l.href)).map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setMore(false)} className="flex min-h-[48px] items-center gap-3 rounded-full px-4 text-[13px] font-semibold text-t2 hover:bg-[rgba(190,249,27,.09)] hover:text-lime">
                <Icon name={l.icon} size={18} />{l.label}
              </Link>
            ))}
            <div className="groove my-2" />
            <button onClick={() => signOut({ callbackUrl: "/login" })} className="btn-ghost w-full !justify-start !px-4"><Icon name="out" size={16} />Sair</button>
          </div>
        </div>
      )}
      <nav className="card fixed inset-x-3 bottom-3 z-40 flex items-center !rounded-[28px] !p-2 pb-[max(8px,env(safe-area-inset-bottom))] md:hidden" style={{ animation: "none" }}>
        {item("/painel", "Painel", "panel")}
        {item("/lancamentos", "Extrato", "list")}
        <Link href="/lancamentos/novo" aria-label="Novo lançamento" className="-mt-7 grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[linear-gradient(145deg,#D0FF45,#A9E113)] text-ink shadow-[8px_8px_17px_rgba(0,4,8,.62),-6px_-6px_15px_rgba(52,90,120,.26)] active:scale-[.97]">
          <Icon name="plus" size={26} />
        </Link>
        {item("/atrasos", "Contas", "clock", overdue)}
        <button onClick={() => setMore((v) => !v)} className={`flex min-h-[48px] flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold ${more ? "text-lime" : "text-t3"}`}>
          <Icon name="menu" size={20} />Mais
        </button>
      </nav>
    </>
  );
}
