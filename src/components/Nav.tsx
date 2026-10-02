"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { useApi } from "@/lib/client";
import { Icon } from "./Icon";
import { ThemeToggle } from "./ThemeToggle";
import { InviteButton } from "./InviteButton";
import { LogoMark } from "./Illustrations";

const LINKS = [
  { href: "/painel", label: "Painel", icon: "panel" },
  { href: "/receitas", label: "Receitas", icon: "up" },
  { href: "/despesas", label: "Despesas", icon: "down" },
  { href: "/planilha", label: "Planilha", icon: "table" },
  { href: "/lancamentos", label: "Extrato", icon: "list" },
  { href: "/atrasos", label: "Contas a pagar", icon: "clock" },
  { href: "/compras", label: "Lista de compras", icon: "cart" },
  { href: "/poupanca", label: "Minha reserva", icon: "coin" },
  { href: "/parcelas", label: "Parcelas", icon: "card" },
  { href: "/previsao", label: "Previsão", icon: "calendar" },
  { href: "/cartoes", label: "Cartões", icon: "bank" },
  { href: "/noticias", label: "Notícias", icon: "news" },
  { href: "/notificacoes", label: "Notificações", icon: "bell" },
  { href: "/configuracoes", label: "Configurações", icon: "gear" },
];
const MORE = ["/planilha", "/lancamentos", "/atrasos", "/compras", "/poupanca", "/parcelas", "/previsao", "/cartoes", "/noticias", "/notificacoes", "/configuracoes"];

function useUnread() {
  const { data } = useApi<{ unread: number }>("/api/notifications?count=1");
  return data?.unread ?? 0;
}

function useOverdueCount() {
  const { data } = useApi<{ overdue: unknown[] }>("/api/overdue");
  return data?.overdue.length ?? 0;
}

export function Sidebar({ userName }: { userName: string }) {
  const path = usePathname();
  const overdue = useOverdueCount();
  const unread = useUnread();
  return (
    <aside className="card fixed inset-y-4 left-4 hidden w-60 flex-col !p-4 md:flex" style={{ animation: "none" }}>
      <div className="mb-5 flex items-center gap-3 px-2 pt-1">
        <LogoMark size={40} />
        <div className="leading-tight">
          <div className="text-[14px] font-semibold">Financeiro</div>
          <div className="kicker !text-[9px]">Familiar</div>
        </div>
      </div>
      <div className="mb-3 grid grid-cols-2 gap-2">
        <Link href="/receitas/nova" className="btn-primary !px-3"><Icon name="plus" size={14} />Receita</Link>
        <Link href="/despesas/nova" className="btn-danger !px-3"><Icon name="plus" size={14} />Despesa</Link>
      </div>
      <InviteButton className="btn-secondary mb-4" />
      <nav className="flex-1 space-y-0 overflow-y-auto pr-0.5">
        {LINKS.map((l) => {
          const active = path.startsWith(l.href);
          return (
            <Link key={l.href} href={l.href}
              className={`flex min-h-[36px] items-center justify-between rounded-full px-4 text-[13px] font-semibold transition ${active ? "nav-active" : "text-t3 hover:bg-[var(--hover-tint)] hover:text-lime"}`}>
              <span className="flex items-center gap-3"><Icon name={l.icon} size={18} />{l.label}</span>
              {l.href === "/atrasos" && overdue > 0 && <span className="badge badge-danger !px-2">{overdue}</span>}
              {l.href === "/notificacoes" && unread > 0 && <span className="badge badge-lime !px-2">{unread}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="groove mt-3 pt-3">
        <div className="mb-1 truncate px-4 text-[12px] text-t3">{userName}</div>
        <ThemeToggle className="w-full !justify-start" />
        <button onClick={() => signOut({ callbackUrl: "/login" })} className="btn-ghost w-full !justify-start"><Icon name="out" size={16} />Sair</button>
      </div>
    </aside>
  );
}

export function BottomNav() {
  const path = usePathname();
  const overdue = useOverdueCount();
  const unread = useUnread();
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
            {LINKS.filter((l) => MORE.includes(l.href)).map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setMore(false)} className="flex min-h-[48px] items-center gap-3 rounded-full px-4 text-[13px] font-semibold text-t2 hover:bg-[var(--hover-tint)] hover:text-lime">
                <Icon name={l.icon} size={18} />{l.label}{l.href === "/notificacoes" && unread > 0 && <span className="badge badge-lime ml-auto !px-2">{unread}</span>}{l.href === "/atrasos" && overdue > 0 && <span className="badge badge-danger ml-auto !px-2">{overdue}</span>}
              </Link>
            ))}
            <InviteButton className="btn-ghost w-full !justify-start !px-4" />
            <div className="groove my-2" />
            <ThemeToggle className="w-full !justify-start !px-4" />
            <button onClick={() => signOut({ callbackUrl: "/login" })} className="btn-ghost w-full !justify-start !px-4"><Icon name="out" size={16} />Sair</button>
          </div>
        </div>
      )}
      <nav className="card fixed inset-x-3 bottom-3 z-40 flex items-center !rounded-[28px] !p-2 pb-[max(8px,env(safe-area-inset-bottom))] md:hidden" style={{ animation: "none" }}>
        {item("/painel", "Painel", "panel")}
        {item("/receitas", "Receitas", "up")}
        <Link href="/lancamentos/novo" aria-label="Novo lançamento" className="fab -mt-7">
          <Icon name="plus" size={26} />
        </Link>
        {item("/despesas", "Despesas", "down", overdue)}
        <button onClick={() => setMore((v) => !v)} className={`relative flex min-h-[48px] flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold ${more ? "text-lime" : "text-t3"}`}>
          <Icon name="menu" size={20} />Mais
          {unread > 0 && <span className="absolute right-[24%] top-0.5 rounded-full bg-[var(--accent)] px-1.5 text-[10px] font-bold text-ink">{unread}</span>}
        </button>
      </nav>
    </>
  );
}
