"use client";
import { useEffect, useState } from "react";
import { api, brl, useApi } from "@/lib/client";
import { ErrorBox, PageHeader, Spinner } from "@/components/ui";

type S = {
  user: { name: string; email: string; emergencyReserve: number };
  family: { name: string; inviteCode: string; emergencyReserve: number; members: { id: string; name: string; email: string }[] };
};

export default function ConfigPage() {
  const { data, error, loading, reload } = useApi<S>("/api/settings");
  const [reserve, setReserve] = useState("");
  const [famReserve, setFamReserve] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (data) { setReserve(String(data.user.emergencyReserve)); setFamReserve(String(data.family.emergencyReserve)); setName(data.user.name); }
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
      {msg && <div className="mb-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">{msg}</div>}
      {loading && !data && <Spinner className="my-10" />}
      {data && (
        <div className="space-y-4">
          <form className="card space-y-3" onSubmit={(e) => { e.preventDefault(); run(() => api("/api/settings", { method: "PUT", body: { name, emergencyReserve: toNum(reserve), familyEmergencyReserve: toNum(famReserve) } }), "Configurações salvas."); }}>
            <h2 className="font-semibold">Perfil e reserva de emergência</h2>
            <div>
              <label className="label" htmlFor="n">Nome</label>
              <input id="n" className="input" value={name} onChange={(e) => setName(e.target.value)} minLength={2} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="r1">Reserva pessoal (R$)</label>
                <input id="r1" className="input" inputMode="decimal" value={reserve} onChange={(e) => setReserve(e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="r2">Reserva familiar (R$)</label>
                <input id="r2" className="input" inputMode="decimal" value={famReserve} onChange={(e) => setFamReserve(e.target.value)} />
              </div>
            </div>
            <p className="text-xs text-slate-500">Valor mínimo que deve sobrar no saldo projetado do mês. Se um novo gasto fizer o saldo ficar abaixo disso (ou negativo), você será avisado antes de confirmar.</p>
            <button className="btn-primary">Salvar</button>
          </form>

          <div className="card space-y-3">
            <h2 className="font-semibold">Família: {data.family.name}</h2>
            <div>
              <div className="label">Código de convite</div>
              <div className="flex items-center gap-2">
                <code className="rounded-lg bg-slate-100 px-3 py-2 text-lg font-bold tracking-widest dark:bg-slate-800">{data.family.inviteCode}</code>
                <button className="btn-secondary" onClick={() => { navigator.clipboard?.writeText(data.family.inviteCode); setMsg("Código copiado."); }}>Copiar</button>
              </div>
              <p className="mt-1 text-xs text-slate-500">Envie este código para quem deve entrar na sua família (informado no cadastro).</p>
            </div>
            <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
              {data.family.members.map((m) => <li key={m.id} className="py-2">{m.name} <span className="text-slate-500">· {m.email}</span></li>)}
            </ul>
          </div>

          {data.family.members.length === 1 && (
            <form className="card space-y-3" onSubmit={(e) => { e.preventDefault(); run(() => api("/api/family/join", { method: "POST", body: { inviteCode: code } }), "Você entrou na nova família."); }}>
              <h2 className="font-semibold">Entrar em outra família</h2>
              <input className="input uppercase" placeholder="Código de convite" value={code} onChange={(e) => setCode(e.target.value)} required />
              <p className="text-xs text-slate-500">Seus lançamentos, cartões e recorrências “familiares” serão migrados para a nova família.</p>
              <button className="btn-secondary">Entrar</button>
            </form>
          )}
          <p className="text-center text-xs text-slate-400">Reserva atual: {brl(data.user.emergencyReserve)} pessoal · {brl(data.family.emergencyReserve)} familiar</p>
        </div>
      )}
    </div>
  );
}
