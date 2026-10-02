"use client";
import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { ErrorBox } from "@/components/ui";

export function JoinLoggedIn({ code, familyName, userName, alreadyIn }: { code: string; familyName: string; userName: string; alreadyIn: boolean }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function join() {
    setBusy(true);
    setErr(null);
    try {
      await api("/api/family/join", { method: "POST", body: { inviteCode: code } });
      window.location.href = "/painel";
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro ao entrar na família");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="kicker">Convite para {userName}</div>
        <h2 className="mt-2 text-[20px] font-semibold text-fg">{familyName}</h2>
      </div>
      {alreadyIn ? (
        <p className="text-[13px] text-t3">Você já faz parte desta família.</p>
      ) : (
        <>
          <p className="text-[13px] leading-relaxed text-t3">Seus lançamentos, cartões e recorrências marcados como “familiares” serão levados para esta família. Os pessoais continuam só seus.</p>
          {err && <ErrorBox message={err} />}
          <button className="btn-primary w-full" onClick={join} disabled={busy}>{busy ? "Entrando..." : "Entrar nesta família"}</button>
        </>
      )}
      <Link href="/painel" className="btn-secondary w-full">Ir para o painel</Link>
    </div>
  );
}
