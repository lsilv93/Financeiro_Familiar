"use client";
import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { ErrorBox } from "@/components/ui";

export function JoinLoggedIn({ code, familyName, userName, alreadyIn }: { code: string; familyName: string; userName: string; alreadyIn: boolean }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function join() {
    setBusy(true);
    setErr(null);
    try {
      await api("/api/family/join", { method: "POST", body: { inviteCode: code } });
      setSent(true);
      setBusy(false);
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
          <p className="text-[13px] leading-relaxed text-t3">O usuário principal da família receberá seu pedido e precisa aceitar. Enquanto isso você continua usando a sua conta normalmente.</p>
          {err && <ErrorBox message={err} />}
          {sent && <div className="well text-[13px] text-lime">Pedido enviado! Avisaremos quando o usuário principal responder.</div>}
          <button className="btn-primary w-full" onClick={join} disabled={busy}>{busy ? "Enviando..." : "Pedir para entrar nesta família"}</button>
        </>
      )}
      <Link href="/painel" className="btn-secondary w-full">Ir para o painel</Link>
    </div>
  );
}
