"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/client";
import { ROLE_LABELS, type RoleKey } from "@/lib/roles";
import { ErrorBox } from "@/components/ui";

function RegisterForm() {
  const sp = useSearchParams();
  const router = useRouter();
  const [mode, setMode] = useState<"create" | "join">(sp.get("modo") === "entrar" || sp.get("codigo") ? "join" : "create");
  const [f, setF] = useState({ name: "", email: "", password: "", inviteCode: (sp.get("codigo") ?? "").toUpperCase(), familyName: "" });
  const [role, setRole] = useState<RoleKey | "">("");
  const [familyFound, setFamilyFound] = useState<string | null>(null);
  const [codeMsg, setCodeMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: k === "inviteCode" ? e.target.value.toUpperCase() : e.target.value });

  // Verifica o código só ao sair do campo (ou quando veio pelo link), para não gastar tentativas digitando.
  async function checkCode(code: string) {
    setFamilyFound(null);
    if (code.length < 4) return;
    try {
      const r = await api<{ valid: boolean; familyName?: string }>(`/api/invite/${encodeURIComponent(code)}`);
      if (r.valid) setFamilyFound(r.familyName ?? "");
      else setCodeMsg("Código não encontrado. Confira com quem convidou você.");
    } catch (e) {
      setCodeMsg(e instanceof Error ? e.message : "Erro ao verificar o código");
    }
  }
  useEffect(() => {
    if (mode === "join" && f.inviteCode) checkCode(f.inviteCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!role) return setError("Escolha se você é marido, mulher ou filho(a)");
    if (mode === "join" && !f.inviteCode) return setError("Informe o código da família");
    setLoading(true);
    try {
      await api("/api/register", {
        method: "POST",
        body: { name: f.name, email: f.email, password: f.password, role, inviteCode: mode === "join" ? f.inviteCode : null, familyName: mode === "create" ? f.familyName || null : null },
      });
      // Cadastro feito: volta para o login com o email já preenchido para o usuário entrar.
      try { sessionStorage.setItem("ff_novo_email", f.email.trim().toLowerCase()); } catch { /* armazenamento indisponível */ }
      router.replace("/login?cadastro=ok");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao cadastrar");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <h2 className="text-[18px] font-semibold text-fg">Criar conta</h2>
      {error && <ErrorBox message={error} />}
      <div>
        <label className="label" htmlFor="name">Nome</label>
        <input id="name" required autoComplete="name" className="input" value={f.name} onChange={set("name")} />
      </div>
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" type="email" required autoComplete="email" className="input" value={f.email} onChange={set("email")} />
      </div>
      <div>
        <label className="label" htmlFor="password">Senha (mín. 8 caracteres)</label>
        <input id="password" type="password" required minLength={8} autoComplete="new-password" className="input" value={f.password} onChange={set("password")} />
      </div>

      <div>
        <span className="label">Quem é você na família?</span>
        <div className="seg w-full" role="radiogroup" aria-label="Papel na família">
          {(Object.keys(ROLE_LABELS) as RoleKey[]).map((r) => (
            <button type="button" key={r} role="radio" aria-checked={role === r} className={`seg-btn ${role === r ? "on" : ""}`} onClick={() => setRole(r)}>{ROLE_LABELS[r]}</button>
          ))}
        </div>
      </div>

      <div>
        <span className="label">Família</span>
        <div className="seg w-full" role="tablist">
          <button type="button" role="tab" aria-selected={mode === "create"} className="seg-btn" onClick={() => setMode("create")}>Criar uma família</button>
          <button type="button" role="tab" aria-selected={mode === "join"} className="seg-btn" onClick={() => setMode("join")}>Tenho um código</button>
        </div>
      </div>

      {mode === "create" ? (
        <div>
          <label className="label" htmlFor="family">Nome da família <span className="normal-case tracking-normal text-t4">(opcional)</span></label>
          <input id="family" className="input" placeholder="Ex.: Família Silva" value={f.familyName} onChange={set("familyName")} />
          <p className="mt-2 text-[11px] text-t4">Depois você poderá convidar os outros membros pelo WhatsApp.</p>
        </div>
      ) : (
        <div>
          <label className="label" htmlFor="invite">Código da família</label>
          <input id="invite" className="input mono uppercase" placeholder="Ex.: A1B2C3D4" value={f.inviteCode} onChange={(e) => { setCodeMsg(null); setFamilyFound(null); set("inviteCode")(e); }} onBlur={() => f.inviteCode && checkCode(f.inviteCode)} />
          {familyFound !== null && <p className="mt-2 text-[12px] font-semibold text-lime">Família encontrada: {familyFound}</p>}
          {codeMsg && <p className="mt-2 text-[12px] text-danger">{codeMsg}</p>}
          <p className="mt-2 text-[11px] text-t4">Por segurança, após 3 códigos inválidos o acesso por convite é bloqueado por 30 minutos.</p>
        </div>
      )}

      <button className="btn-primary w-full" disabled={loading}>{loading ? "Criando conta..." : "Criar conta"}</button>
      <p className="text-center text-[13px] text-t3">
        Já tem conta? <Link href="/login" className="font-semibold text-lime hover:text-lime-hover">Entrar</Link>
      </p>
    </form>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
