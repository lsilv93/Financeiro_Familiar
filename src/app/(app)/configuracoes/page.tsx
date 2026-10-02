"use client";
import { useEffect, useState } from "react";
import { api, brl, useApi } from "@/lib/client";
import { ErrorBox, PageHeader, SectionTitle, Spinner } from "@/components/ui";
import { ROLE_LABELS, type RoleKey } from "@/lib/roles";
import { InviteButton } from "@/components/InviteButton";

type S = {
  user: { name: string; email: string; role: RoleKey | null; emergencyReserve: number };
  family: { name: string; inviteCode: string; emergencyReserve: number; members: { id: string; name: string; email: string; role: RoleKey | null }[] };
};

export default function ConfigPage() {
  const { data, error, loading, reload } = useApi<S>("/api/settings");
  const [reserve, setReserve] = useState("");
  const [famReserve, setFamReserve] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<RoleKey | "">("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (data) { setReserve(String(data.user.emergencyReserve)); setFamReserve(String(data.family.emergencyReserve)); setName(data.user.name); setRole(data.user.role ?? ""); }
  }, [data]);

  const toNum = (s: string) => Number(s.replace(",", ".")) || 0;
  async function run(fn: () => Promise<unknown>, ok: string) {
    setErr(null); setMsg(null);
    try { await fn(); setMsg(ok); reload(); } catch (e) { setErr(e instanceof Error ? e.message : "Erro"); }
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Configurações" />
      {(error || err) && <ErrorBox message={(error || err)!} />}
      {msg && <div className="well mb-4 text-[13px] text-lime">{msg}</div>}
      {loading && !data && <Spinner className="my-16" />}
      {data && (
        <div className="stagger space-y-5">
          <form className="card space-y-5" onSubmit={(e) => { e.preventDefault(); run(() => api("/api/settings", { method: "PUT", body: { name, role: role || undefined, emergencyReserve: toNum(reserve), familyEmergencyReserve: toNum(famReserve) } }), "Configurações salvas."); }}>
            <SectionTitle>Perfil e reserva de emergência</SectionTitle>
            <div>
              <label className="label" htmlFor="n">Nome</label>
              <input id="n" className="input" value={name} onChange={(e) => setName(e.target.value)} minLength={2} required />
            </div>
            <div>
              <span className="label">Quem é você na família?</span>
              <div className="seg w-full" role="radiogroup">
                {(Object.keys(ROLE_LABELS) as RoleKey[]).map((r) => (
                  <button type="button" key={r} role="radio" aria-checked={role === r} className={`seg-btn ${role === r ? "on" : ""}`} onClick={() => setRole(r)}>{ROLE_LABELS[r]}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="r1">Reserva pessoal (R$)</label>
                <input id="r1" className="input mono" inputMode="decimal" value={reserve} onChange={(e) => setReserve(e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="r2">Reserva familiar (R$)</label>
                <input id="r2" className="input mono" inputMode="decimal" value={famReserve} onChange={(e) => setFamReserve(e.target.value)} />
              </div>
            </div>
            <p className="text-[11px] leading-relaxed text-t4">Valor mínimo que deve sobrar no saldo projetado do mês. Se um novo gasto fizer o saldo ficar abaixo disso (ou negativo), você será avisado antes de confirmar.</p>
            <button className="btn-primary">Salvar</button>
          </form>

          <div className="card space-y-5">
            <SectionTitle>Família: {data.family.name}</SectionTitle>
            <div>
              <div className="label">Código de convite</div>
              <div className="flex items-center gap-2">
                <code className="well mono !rounded-[16px] !px-4 !py-2 text-[18px] font-semibold tracking-[0.2em] text-lime">{data.family.inviteCode}</code>
                <button className="btn-secondary" onClick={() => { navigator.clipboard?.writeText(data.family.inviteCode); setMsg("Código copiado."); }}>Copiar</button>
              </div>
              <p className="mt-2 text-[11px] text-t4">Envie o código ou, mais fácil, convide direto pelo WhatsApp.</p>
              <div className="mt-3"><InviteButton /></div>
            </div>
            <ul className="well rows text-[13px]">
              {data.family.members.map((m) => <li key={m.id} className="flex items-center justify-between gap-2 py-2.5 text-fg"><span className="min-w-0 truncate">{m.name} <span className="text-t3">· {m.email}</span></span>{m.role && <span className="badge badge-lime">{ROLE_LABELS[m.role]}</span>}</li>)}
            </ul>
          </div>

          {data.family.members.length === 1 && (
            <form className="card space-y-5" onSubmit={(e) => { e.preventDefault(); run(() => api("/api/family/join", { method: "POST", body: { inviteCode: code } }), "Você entrou na nova família."); }}>
              <SectionTitle>Entrar em outra família</SectionTitle>
              <input className="input uppercase" placeholder="Código de convite" value={code} onChange={(e) => setCode(e.target.value)} required />
              <p className="text-[11px] text-t4">Seus lançamentos, cartões e recorrências “familiares” serão migrados para a nova família.</p>
              <button className="btn-secondary">Entrar</button>
            </form>
          )}
          <p className="mono text-center text-[11px] text-t4">Reserva atual: {brl(data.user.emergencyReserve)} pessoal · {brl(data.family.emergencyReserve)} familiar</p>
        </div>
      )}
    </div>
  );
}
