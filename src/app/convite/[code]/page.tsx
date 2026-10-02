import Link from "next/link";
import { HttpError, getCurrentUser } from "@/lib/session";
import { lookupInvite } from "@/lib/security";
import { AuthShell } from "@/components/AuthShell";
import { JoinLoggedIn } from "./JoinLoggedIn";

export const dynamic = "force-dynamic";

export default async function ConvitePage({ params }: { params: Promise<{ code: string }> }) {
  const code = (await params).code.trim().toUpperCase();
  const user = await getCurrentUser();
  let family: { id: string; name: string } | null = null;
  let blockedMsg: string | null = null;
  try {
    family = await lookupInvite(code, user?.id);
  } catch (e) {
    if (e instanceof HttpError) blockedMsg = e.message;
    else throw e;
  }

  return (
    <AuthShell>
      <div className="card !p-7">
        {!family ? (
          <div className="space-y-5">
            <h2 className="text-[18px] font-semibold text-fg">{blockedMsg ? "Acesso bloqueado" : "Convite inválido"}</h2>
            <p className="text-[13px] text-t3">{blockedMsg ?? "Este link de convite não é válido ou expirou. Peça um novo link para quem convidou você."}</p>
            <Link href="/register" className="btn-primary w-full">Criar uma conta</Link>
          </div>
        ) : user ? (
          <JoinLoggedIn code={code} familyName={family.name} userName={user.name} alreadyIn={user.familyId === family.id} />
        ) : (
          <div className="space-y-5">
            <div>
              <div className="kicker">Você foi convidado</div>
              <h2 className="mt-2 text-[20px] font-semibold text-fg">Família {family.name.replace(/^Família\s+/i, "")}</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-t3">Escolha como quer começar. Cada família enxerga somente os próprios dados.</p>
            </div>
            <Link href={`/register?modo=entrar&codigo=${code}`} className="btn-primary w-full">Entrar nesta família</Link>
            <Link href="/register?modo=criar" className="btn-secondary w-full">Criar minha própria família</Link>
            <p className="text-center text-[12px] text-t4">Já tem conta? <Link href="/login" className="font-semibold text-lime">Entrar</Link> e usar o código em Configurações.</p>
          </div>
        )}
      </div>
    </AuthShell>
  );
}
