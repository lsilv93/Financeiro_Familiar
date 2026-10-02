"use client";
import { useApi } from "@/lib/client";
import { Icon } from "./Icon";

type S = { user: { name: string }; family: { name: string; inviteCode: string } };

/** Abre o WhatsApp (app ou web) com a mensagem de convite pronta; a pessoa escolhe o contato. */
export function InviteButton({ className = "btn-primary", label = "Convidar família" }: { className?: string; label?: string }) {
  const { data } = useApi<S>("/api/settings");
  if (!data) return <button className={className} disabled>{label}</button>;
  const link = `${window.location.origin}/convite/${data.family.inviteCode}`;
  const text = `Olá! ${data.user.name} está te convidando para usar o Financeiro Familiar e organizar as finanças da família juntos.\n\nAcesse o link para criar sua conta ou pedir para entrar na família "${data.family.name}" (eu aprovo seu acesso depois):\n${link}`;
  return (
    <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" className={className}>
      <Icon name="share" size={16} />{label}
    </a>
  );
}
