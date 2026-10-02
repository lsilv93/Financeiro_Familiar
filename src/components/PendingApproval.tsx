"use client";
import { useEffect } from "react";
import { signOut } from "next-auth/react";
import { useApi } from "@/lib/client";
import { Coin, LogoMark } from "./Illustrations";
import { ThemeIconButton } from "./ThemeToggle";

type St = { awaitingApproval: boolean; request: { status: "PENDING" | "APPROVED" | "REJECTED"; familyName: string; ownerName: string | null } | null };

/** Tela única mostrada a quem entrou por código e ainda não foi aprovado: nenhum dado da família aparece. */
export function PendingApproval({ userName }: { userName: string }) {
  const { data, reload } = useApi<St>("/api/me/status");
  useEffect(() => {
    const t = setInterval(reload, 10000);
    return () => clearInterval(t);
  }, [reload]);
  useEffect(() => {
    if (data && !data.awaitingApproval) window.location.href = "/painel";
  }, [data]);

  const rejected = data?.request?.status === "REJECTED";
  return (
    <div className="relative flex min-h-screen items-center justify-center p-[14px]">
      <div className="absolute right-4 top-4"><ThemeIconButton /></div>
      <main className="card w-full max-w-md space-y-5 !p-7 text-center">
        <div className="mx-auto flex items-center justify-center gap-3"><Coin size={26} /><LogoMark size={56} /><Coin size={26} style={{ animationDelay: "-1.6s" }} /></div>
        <h1 className="text-[22px] text-fg">Aguardando aprovação</h1>
        <p className="text-[14px] leading-relaxed text-t2">
          Olá, <b className="text-fg">{userName}</b>! Seu pedido para entrar na família <b className="text-fg">{data?.request?.familyName ?? "…"}</b> foi enviado
          {data?.request?.ownerName ? <> para <b className="text-fg">{data.request.ownerName}</b></> : null}.
        </p>
        <div className="well text-[13px] leading-relaxed text-t3">
          {rejected ? "O pedido foi recusado." : "Assim que o usuário principal aceitar em Notificações, você terá acesso à conta da família. Esta tela atualiza sozinha."}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button className="btn-secondary flex-1" onClick={reload}>Verificar agora</button>
          <button className="btn-ghost flex-1" onClick={() => signOut({ callbackUrl: "/login" })}>Sair</button>
        </div>
      </main>
    </div>
  );
}
