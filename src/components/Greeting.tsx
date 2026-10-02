"use client";
import { useEffect, useState } from "react";

const TZ = "America/Sao_Paulo";

function parts(d: Date) {
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", hourCycle: "h23" }).format(d));
  const date = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, weekday: "long", day: "2-digit", month: "long", year: "numeric" }).format(d);
  const time = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(d);
  const greeting = hour >= 5 && hour < 12 ? "Bom dia" : hour >= 12 && hour < 18 ? "Boa tarde" : "Boa noite";
  const icon = hour >= 5 && hour < 12 ? "☀️" : hour >= 12 && hour < 18 ? "🌤️" : "🌙";
  return { greeting, icon, date: date.charAt(0).toUpperCase() + date.slice(1), time };
}

/** Saudação (Bom dia / Boa tarde / Boa noite) com data e hora de Brasília, nome do usuário e da família. */
export function Greeting({ userName, familyName }: { userName: string; familyName: string }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);
  const p = parts(now);
  const first = userName.trim().split(/\s+/)[0] || userName;
  return (
    <div className="card mb-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 !p-[18px]" style={{ animation: "none" }}>
      <div className="min-w-0">
        <div className="text-[18px] font-semibold text-fg md:text-[20px]" suppressHydrationWarning>
          <span className="mr-2" aria-hidden="true">{p.icon}</span>{p.greeting}, {first}!
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-t3">
          <span className="truncate font-semibold text-t2" title={userName}>{userName}</span>
          <span aria-hidden="true">·</span>
          <span className="badge badge-lime truncate" title="Família">👨‍👩‍👧 {familyName}</span>
        </div>
      </div>
      <div className="text-left sm:text-right" suppressHydrationWarning>
        <div className="mono text-[22px] font-semibold leading-none text-fg" aria-label="Hora de Brasília">{p.time}</div>
        <div className="mt-1 text-[11px] text-t3">{p.date} · horário de Brasília</div>
      </div>
    </div>
  );
}
